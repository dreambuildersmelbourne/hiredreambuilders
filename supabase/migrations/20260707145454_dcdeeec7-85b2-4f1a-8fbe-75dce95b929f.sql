
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS hero_url text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS best_for text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS included_equipment text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS optional_extras text[] NOT NULL DEFAULT '{}';

INSERT INTO public.rooms (name, slug, hourly_rate, bond, min_hours, capacity, sort_order, active, description)
VALUES ('Foyer', 'foyer', 0, 0, 0, 80, 6, true, 'Welcome foyer for guest arrivals, registration desks and pre-event drinks.')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.room_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image','video','youtube','vimeo')),
  media_url text NOT NULL,
  thumbnail_url text,
  caption text,
  display_order integer NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT true,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.room_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.room_media TO authenticated;
GRANT ALL ON public.room_media TO service_role;

ALTER TABLE public.room_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read public room_media" ON public.room_media FOR SELECT TO anon, authenticated
  USING (is_public = true OR private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'staff'));

CREATE POLICY "admins manage room_media" ON public.room_media FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'))
  WITH CHECK (private.has_role(auth.uid(),'admin'));

CREATE TRIGGER room_media_set_updated_at BEFORE UPDATE ON public.room_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS room_media_room_order_idx ON public.room_media (room_id, display_order);
