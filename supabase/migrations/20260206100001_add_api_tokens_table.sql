-- Migration: Create api_tokens table for desktop app authentication
-- API tokens are persistent (unlike Supabase JWTs which expire)

CREATE TABLE IF NOT EXISTS public.api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT 'Desktop App',
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup by token value (used on every API request)
CREATE INDEX IF NOT EXISTS idx_api_tokens_token ON public.api_tokens (token);

-- List tokens by user
CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON public.api_tokens (user_id);

-- RLS: users can only manage their own tokens
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tokens"
    ON public.api_tokens FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tokens"
    ON public.api_tokens FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
    ON public.api_tokens FOR DELETE
    USING (auth.uid() = user_id);

-- No UPDATE policy needed: last_used_at is updated via service role client
-- (service role bypasses RLS entirely)

COMMENT ON TABLE public.api_tokens IS 'Persistent API tokens for desktop app and external integrations';
COMMENT ON COLUMN public.api_tokens.token IS 'Random 64-character hex string, shown to user only once at creation';
COMMENT ON COLUMN public.api_tokens.last_used_at IS 'Updated each time the token is used to authenticate an API request';
