ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS entry_type text NOT NULL DEFAULT 'booking',
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_entry_type_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_entry_type_check CHECK (entry_type IN ('booking','internal'));

ALTER TABLE public.bookings ALTER COLUMN customer_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.bookings_validate_entry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.entry_type = 'booking' AND NEW.customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id is required for booking entries';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_validate_entry_trg ON public.bookings;
CREATE TRIGGER bookings_validate_entry_trg
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_validate_entry();

DROP POLICY IF EXISTS "admins insert bookings" ON public.bookings;
CREATE POLICY "admins insert bookings" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));

DROP POLICY IF EXISTS "admins insert customers" ON public.customers;
CREATE POLICY "admins insert customers" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'staff'::app_role));