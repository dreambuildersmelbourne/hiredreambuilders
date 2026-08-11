GRANT SELECT ON public.room_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_media TO authenticated;
GRANT ALL ON public.room_media TO service_role;