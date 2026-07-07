
CREATE POLICY "public read room-media" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'room-media');
CREATE POLICY "admins upload room-media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'room-media' AND private.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update room-media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'room-media' AND private.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete room-media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'room-media' AND private.has_role(auth.uid(),'admin'));
