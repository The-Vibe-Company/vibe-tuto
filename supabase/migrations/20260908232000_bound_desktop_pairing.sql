-- Bound public pairing writes globally and per client across server instances.
ALTER TABLE public.desktop_connections ADD COLUMN requester_hash text;
CREATE INDEX desktop_connections_requester_idx ON public.desktop_connections(requester_hash, expires_at);
CREATE FUNCTION public.begin_desktop_connection(code_challenge text, requester text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE new_id uuid;
BEGIN
  IF code_challenge !~ '^[0-9a-f]{64}$' OR requester !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid pairing input';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('captuto-desktop-pairing-start'));
  -- Work per request is bounded; no unbounded cleanup scan/delete on public calls.
  DELETE FROM desktop_connections WHERE id IN (
    SELECT id FROM desktop_connections WHERE expires_at < now() ORDER BY expires_at LIMIT 100
  );
  IF (SELECT count(*) FROM (SELECT 1 FROM desktop_connections LIMIT 2000) s) >= 2000
    OR (SELECT count(*) FROM desktop_connections WHERE requester_hash = requester AND expires_at > now()) >= 10 THEN
    RETURN jsonb_build_object('status', 'limited');
  END IF;
  INSERT INTO desktop_connections(challenge,requester_hash) VALUES(code_challenge,requester) RETURNING id INTO new_id;
  RETURN jsonb_build_object('status', 'created', 'id', new_id);
END;
$$;
REVOKE ALL ON FUNCTION public.begin_desktop_connection(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_desktop_connection(text,text) TO service_role;
