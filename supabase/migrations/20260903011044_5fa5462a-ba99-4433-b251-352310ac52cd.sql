ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS signing_token text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_to text,
  ADD COLUMN IF NOT EXISTS signed_method text,
  ADD COLUMN IF NOT EXISTS signed_email text,
  ADD COLUMN IF NOT EXISTS uploaded_file_path text,
  ADD COLUMN IF NOT EXISTS uploaded_at timestamptz;

UPDATE public.contracts
  SET signing_token = encode(gen_random_bytes(24), 'hex')
  WHERE signing_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contracts_signing_token_key ON public.contracts (signing_token);