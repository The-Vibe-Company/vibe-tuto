-- Browser consent + proof-of-possession pairing for the native recorder.
-- No verifier or bearer token is put in a browser URL.
CREATE TABLE public.desktop_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge text NOT NULL CHECK (challenge ~ '^[0-9a-f]{64}$'),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  token_id uuid REFERENCES public.api_tokens(id) ON DELETE SET NULL,
  issued_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '5 minutes',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX desktop_connections_expiry_idx ON public.desktop_connections(expires_at);
ALTER TABLE public.desktop_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.desktop_connections FROM anon, authenticated;
GRANT ALL ON public.desktop_connections TO service_role;

CREATE FUNCTION public.approve_desktop_connection(connection_id uuid, approving_user_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE pairing public.desktop_connections%ROWTYPE;
BEGIN
  SELECT * INTO pairing FROM public.desktop_connections WHERE id = connection_id FOR UPDATE;
  IF NOT FOUND OR pairing.expires_at <= now() THEN RETURN 'expired'; END IF;
  IF pairing.user_id IS NOT NULL AND pairing.user_id <> approving_user_id THEN RETURN 'claimed'; END IF;
  UPDATE public.desktop_connections SET user_id = approving_user_id WHERE id = connection_id;
  RETURN 'approved';
END;
$$;

CREATE FUNCTION public.exchange_desktop_connection(connection_id uuid, verifier text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  pairing public.desktop_connections%ROWTYPE;
  issued_token text;
  issued_token_id uuid;
BEGIN
  SELECT * INTO pairing FROM public.desktop_connections WHERE id = connection_id FOR UPDATE;
  IF NOT FOUND OR pairing.expires_at <= now() THEN RETURN jsonb_build_object('status', 'expired'); END IF;
  IF verifier IS NULL OR length(verifier) < 32 OR length(verifier) > 256 OR
     encode(extensions.digest(convert_to(verifier, 'UTF8'), 'sha256'), 'hex') <> pairing.challenge
  THEN RETURN jsonb_build_object('status', 'invalid'); END IF;
  IF pairing.user_id IS NULL THEN RETURN jsonb_build_object('status', 'pending'); END IF;

  -- Serialize polling retries. An already issued credential is returned until expiry;
  -- a token explicitly revoked by its owner must never be recreated by a retry.
  IF pairing.issued_at IS NOT NULL THEN
    SELECT token INTO issued_token FROM public.api_tokens WHERE id = pairing.token_id AND user_id = pairing.user_id;
    IF issued_token IS NULL THEN RETURN jsonb_build_object('status', 'revoked'); END IF;
  ELSE
    issued_token := encode(extensions.gen_random_bytes(32), 'hex');
    INSERT INTO public.api_tokens(user_id, token, name)
      VALUES (pairing.user_id, issued_token, 'Captuto for Mac') RETURNING id INTO issued_token_id;
    UPDATE public.desktop_connections SET token_id = issued_token_id, issued_at = now() WHERE id = connection_id;
  END IF;
  RETURN jsonb_build_object('status', 'connected', 'token', issued_token);
END;
$$;
REVOKE ALL ON FUNCTION public.approve_desktop_connection(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.exchange_desktop_connection(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_desktop_connection(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.exchange_desktop_connection(uuid, text) TO service_role;
