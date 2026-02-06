-- Migration: Create RPC function for API token validation
-- Uses SECURITY DEFINER so callers (anon key) can validate tokens
-- without bypassing RLS on the api_tokens table directly.

CREATE OR REPLACE FUNCTION public.validate_api_token(token_value text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user_id uuid;
BEGIN
  SELECT user_id INTO found_user_id
  FROM api_tokens
  WHERE token = token_value;

  IF found_user_id IS NOT NULL THEN
    UPDATE api_tokens SET last_used_at = now() WHERE token = token_value;
  END IF;

  RETURN found_user_id;
END;
$$;

COMMENT ON FUNCTION public.validate_api_token IS 'Validates an API token and returns the associated user_id. Updates last_used_at on success.';
