
DROP POLICY IF EXISTS "public read room-media" ON storage.objects;

CREATE POLICY "public read room-media"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'room-media'
  AND (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'staff'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.room_media rm
      WHERE rm.storage_path = storage.objects.name
        AND rm.is_public = true
    )
  )
);

DROP POLICY IF EXISTS "public submit booking_rooms" ON public.booking_rooms;
CREATE POLICY "public submit booking_rooms"
ON public.booking_rooms
FOR INSERT
WITH CHECK (
  booking_id IS NOT NULL
  AND room_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_rooms.booking_id
      AND b.status = 'enquiry'::booking_status
      AND b.created_at > now() - interval '15 minutes'
  )
);

DROP POLICY IF EXISTS "public submit booking_extras" ON public.booking_extras;
CREATE POLICY "public submit booking_extras"
ON public.booking_extras
FOR INSERT
WITH CHECK (
  booking_id IS NOT NULL
  AND extra_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_extras.booking_id
      AND b.status = 'enquiry'::booking_status
      AND b.created_at > now() - interval '15 minutes'
  )
);

DROP POLICY IF EXISTS "public submit booking_staff" ON public.booking_staff;
CREATE POLICY "public submit booking_staff"
ON public.booking_staff
FOR INSERT
WITH CHECK (
  booking_id IS NOT NULL
  AND staff_role_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_staff.booking_id
      AND b.status = 'enquiry'::booking_status
      AND b.created_at > now() - interval '15 minutes'
  )
);
