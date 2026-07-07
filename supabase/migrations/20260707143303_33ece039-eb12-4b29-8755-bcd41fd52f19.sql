
DROP POLICY IF EXISTS "customers create own contract" ON public.contracts;
CREATE POLICY "customers create own contract" ON public.contracts
  FOR INSERT TO authenticated
  WITH CHECK (private.owns_booking(booking_id, auth.uid()));

GRANT INSERT ON public.contracts TO authenticated;
