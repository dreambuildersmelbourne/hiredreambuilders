CREATE TABLE IF NOT EXISTS public.calendar_sync_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  feed_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  include_statuses text[] NOT NULL DEFAULT ARRAY['tentative','pending_approval','confirmed','completed']::text[],
  include_tentative boolean NOT NULL DEFAULT true,
  include_cancelled boolean NOT NULL DEFAULT false,
  include_contact_details boolean NOT NULL DEFAULT false,
  include_internal_notes boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_sync_settings_singleton_uniq UNIQUE (singleton)
);

GRANT SELECT, INSERT, UPDATE ON public.calendar_sync_settings TO authenticated;
GRANT ALL ON public.calendar_sync_settings TO service_role;

ALTER TABLE public.calendar_sync_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read calendar sync" ON public.calendar_sync_settings;
CREATE POLICY "admins read calendar sync" ON public.calendar_sync_settings
  FOR SELECT USING (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admins update calendar sync" ON public.calendar_sync_settings;
CREATE POLICY "admins update calendar sync" ON public.calendar_sync_settings
  FOR UPDATE USING (private.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admins insert calendar sync" ON public.calendar_sync_settings;
CREATE POLICY "admins insert calendar sync" ON public.calendar_sync_settings
  FOR INSERT WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER calendar_sync_settings_updated
  BEFORE UPDATE ON public.calendar_sync_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.calendar_sync_settings (singleton) VALUES (true)
  ON CONFLICT (singleton) DO NOTHING;