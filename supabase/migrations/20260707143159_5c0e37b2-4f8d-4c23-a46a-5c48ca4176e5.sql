
-- === Phase 2: customer accounts, documents, admin actions ===

-- 1. Extend customers with user_id (nullable — public quotes still allowed)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS customers_user_id_idx ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS customers_email_idx ON public.customers(lower(email));

-- 2. Extend bookings with admin-action fields
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason text,
  ADD COLUMN IF NOT EXISTS info_request_message text,
  ADD COLUMN IF NOT EXISTS staffing_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS balance_paid_at timestamptz;

-- 3. Extend booking_status enum with new values (idempotent)
DO $$ BEGIN
  ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'approved' AFTER 'reviewing';
  ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'rejected' AFTER 'approved';
  ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'info_requested' AFTER 'rejected';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Helper: does auth.uid() own this booking?  (SECURITY DEFINER avoids RLS recursion)
CREATE OR REPLACE FUNCTION private.owns_booking(_booking_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.customers c ON c.id = b.customer_id
    WHERE b.id = _booking_id AND c.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION private.owns_customer(_customer_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customers WHERE id = _customer_id AND user_id = _user_id
  );
$$;

-- 5. Customer-facing RLS: customers can read/update their own record
DROP POLICY IF EXISTS "customers read own" ON public.customers;
CREATE POLICY "customers read own" ON public.customers
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "customers update own" ON public.customers;
CREATE POLICY "customers update own" ON public.customers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 6. Customer-facing RLS on bookings
DROP POLICY IF EXISTS "customers read own bookings" ON public.bookings;
CREATE POLICY "customers read own bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid()
  ));

-- 7. Customer read on booking child tables
DROP POLICY IF EXISTS "customers read own booking_rooms" ON public.booking_rooms;
CREATE POLICY "customers read own booking_rooms" ON public.booking_rooms
  FOR SELECT TO authenticated USING (private.owns_booking(booking_id, auth.uid()));

DROP POLICY IF EXISTS "customers read own booking_extras" ON public.booking_extras;
CREATE POLICY "customers read own booking_extras" ON public.booking_extras
  FOR SELECT TO authenticated USING (private.owns_booking(booking_id, auth.uid()));

DROP POLICY IF EXISTS "customers read own booking_staff" ON public.booking_staff;
CREATE POLICY "customers read own booking_staff" ON public.booking_staff
  FOR SELECT TO authenticated USING (private.owns_booking(booking_id, auth.uid()));

-- 8. Contracts: customer can read own & sign (update signed_at + signed_name)
DROP POLICY IF EXISTS "customers read own contracts" ON public.contracts;
CREATE POLICY "customers read own contracts" ON public.contracts
  FOR SELECT TO authenticated USING (private.owns_booking(booking_id, auth.uid()));

DROP POLICY IF EXISTS "customers sign own contracts" ON public.contracts;
CREATE POLICY "customers sign own contracts" ON public.contracts
  FOR UPDATE TO authenticated
  USING (private.owns_booking(booking_id, auth.uid()))
  WITH CHECK (private.owns_booking(booking_id, auth.uid()));

-- 9. Payments: customer can read own
DROP POLICY IF EXISTS "customers read own payments" ON public.payments;
CREATE POLICY "customers read own payments" ON public.payments
  FOR SELECT TO authenticated USING (private.owns_booking(booking_id, auth.uid()));

-- 10. Documents: customer can insert & read own booking's docs
DROP POLICY IF EXISTS "customers read own documents" ON public.documents;
CREATE POLICY "customers read own documents" ON public.documents
  FOR SELECT TO authenticated
  USING (booking_id IS NOT NULL AND private.owns_booking(booking_id, auth.uid()));

DROP POLICY IF EXISTS "customers insert own documents" ON public.documents;
CREATE POLICY "customers insert own documents" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    booking_id IS NOT NULL
    AND private.owns_booking(booking_id, auth.uid())
    AND uploaded_by = auth.uid()
    AND kind IN ('public_liability','streatrader','advertising','other')
  );

DROP POLICY IF EXISTS "customers delete own documents" ON public.documents;
CREATE POLICY "customers delete own documents" ON public.documents
  FOR DELETE TO authenticated
  USING (booking_id IS NOT NULL AND private.owns_booking(booking_id, auth.uid()) AND uploaded_by = auth.uid());

-- 11. Update handle_new_user: only first user becomes admin; subsequent signups are customers (no role).
--     Also link matching customer records by email.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users;

  -- First-ever user becomes admin
  IF user_count <= 1 THEN
    INSERT INTO public.admin_users (user_id, email, display_name)
      VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
      ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT DO NOTHING;
  END IF;

  -- Link any existing customer records that share this email
  UPDATE public.customers
    SET user_id = NEW.id
    WHERE lower(email) = lower(NEW.email) AND user_id IS NULL;

  RETURN NEW;
END;
$function$;

-- 12. Grants (idempotent) — ensure authenticated role can hit new columns/policies
GRANT SELECT, UPDATE ON public.customers TO authenticated;
GRANT SELECT ON public.bookings TO authenticated;
GRANT SELECT ON public.booking_rooms TO authenticated;
GRANT SELECT ON public.booking_extras TO authenticated;
GRANT SELECT ON public.booking_staff TO authenticated;
GRANT SELECT, UPDATE ON public.contracts TO authenticated;
GRANT SELECT ON public.payments TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.documents TO authenticated;
