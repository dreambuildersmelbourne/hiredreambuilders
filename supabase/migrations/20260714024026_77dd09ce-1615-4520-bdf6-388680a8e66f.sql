CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage app settings"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Authenticated users can read app settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER app_settings_updated
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();