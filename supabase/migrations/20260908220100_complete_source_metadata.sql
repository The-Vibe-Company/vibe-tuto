-- Fresh installs lacked this column despite capture, editor and generation using it.
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS element_info JSONB;
