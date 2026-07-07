
-- Storage RLS for booking-documents bucket.
-- Files are stored under: <booking_id>/<uuid>-<filename>

DROP POLICY IF EXISTS "booking_docs customer upload" ON storage.objects;
CREATE POLICY "booking_docs customer upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'booking-documents'
    AND private.owns_booking((split_part(name, '/', 1))::uuid, auth.uid())
    AND owner = auth.uid()
  );

DROP POLICY IF EXISTS "booking_docs customer read" ON storage.objects;
CREATE POLICY "booking_docs customer read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'booking-documents'
    AND (
      private.owns_booking((split_part(name, '/', 1))::uuid, auth.uid())
      OR private.has_role(auth.uid(), 'admin'::app_role)
      OR private.has_role(auth.uid(), 'staff'::app_role)
    )
  );

DROP POLICY IF EXISTS "booking_docs customer delete" ON storage.objects;
CREATE POLICY "booking_docs customer delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'booking-documents'
    AND (
      (private.owns_booking((split_part(name, '/', 1))::uuid, auth.uid()) AND owner = auth.uid())
      OR private.has_role(auth.uid(), 'admin'::app_role)
    )
  );
