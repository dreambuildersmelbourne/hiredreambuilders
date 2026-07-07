
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role); $$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT
  USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins manage rooms" ON public.rooms;
CREATE POLICY "admins manage rooms" ON public.rooms FOR ALL
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins manage extras" ON public.extras;
CREATE POLICY "admins manage extras" ON public.extras FOR ALL
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins manage staff roles" ON public.staff_roles;
CREATE POLICY "admins manage staff roles" ON public.staff_roles FOR ALL
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins read customers" ON public.customers;
CREATE POLICY "admins read customers" ON public.customers FOR SELECT
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'staff'));
DROP POLICY IF EXISTS "admins manage customers" ON public.customers;
CREATE POLICY "admins manage customers" ON public.customers FOR UPDATE
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins delete customers" ON public.customers;
CREATE POLICY "admins delete customers" ON public.customers FOR DELETE
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "staff read bookings" ON public.bookings;
CREATE POLICY "staff read bookings" ON public.bookings FOR SELECT
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'staff'));
DROP POLICY IF EXISTS "admins update bookings" ON public.bookings;
CREATE POLICY "admins update bookings" ON public.bookings FOR UPDATE
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins delete bookings" ON public.bookings;
CREATE POLICY "admins delete bookings" ON public.bookings FOR DELETE
  USING (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "staff read booking_rooms" ON public.booking_rooms;
CREATE POLICY "staff read booking_rooms" ON public.booking_rooms FOR SELECT
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'staff'));
DROP POLICY IF EXISTS "admins manage booking_rooms" ON public.booking_rooms;
CREATE POLICY "admins manage booking_rooms" ON public.booking_rooms FOR ALL
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "staff read booking_extras" ON public.booking_extras;
CREATE POLICY "staff read booking_extras" ON public.booking_extras FOR SELECT
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'staff'));
DROP POLICY IF EXISTS "admins manage booking_extras" ON public.booking_extras;
CREATE POLICY "admins manage booking_extras" ON public.booking_extras FOR ALL
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "staff read booking_staff" ON public.booking_staff;
CREATE POLICY "staff read booking_staff" ON public.booking_staff FOR SELECT
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'staff'));
DROP POLICY IF EXISTS "admins manage booking_staff" ON public.booking_staff;
CREATE POLICY "admins manage booking_staff" ON public.booking_staff FOR ALL
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "staff read documents" ON public.documents;
CREATE POLICY "staff read documents" ON public.documents FOR SELECT
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'staff'));
DROP POLICY IF EXISTS "admins manage documents" ON public.documents;
CREATE POLICY "admins manage documents" ON public.documents FOR ALL
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "staff read contracts" ON public.contracts;
CREATE POLICY "staff read contracts" ON public.contracts FOR SELECT
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'staff'));
DROP POLICY IF EXISTS "admins manage contracts" ON public.contracts;
CREATE POLICY "admins manage contracts" ON public.contracts FOR ALL
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "staff read payments" ON public.payments;
CREATE POLICY "staff read payments" ON public.payments FOR SELECT
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'staff'));
DROP POLICY IF EXISTS "admins manage payments" ON public.payments;
CREATE POLICY "admins manage payments" ON public.payments FOR ALL
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "staff read tasks" ON public.tasks;
CREATE POLICY "staff read tasks" ON public.tasks FOR SELECT
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'staff'));
DROP POLICY IF EXISTS "admins manage tasks" ON public.tasks;
CREATE POLICY "admins manage tasks" ON public.tasks FOR ALL
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "staff read checklists" ON public.event_day_checklists;
CREATE POLICY "staff read checklists" ON public.event_day_checklists FOR SELECT
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'staff'));
DROP POLICY IF EXISTS "admins manage checklists" ON public.event_day_checklists;
CREATE POLICY "admins manage checklists" ON public.event_day_checklists FOR ALL
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "staff read assignments" ON public.staff_assignments;
CREATE POLICY "staff read assignments" ON public.staff_assignments FOR SELECT
  USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'staff'));
DROP POLICY IF EXISTS "admins manage assignments" ON public.staff_assignments;
CREATE POLICY "admins manage assignments" ON public.staff_assignments FOR ALL
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "self or admin read admin_users" ON public.admin_users;
CREATE POLICY "self or admin read admin_users" ON public.admin_users FOR SELECT
  USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins manage admin_users" ON public.admin_users;
CREATE POLICY "admins manage admin_users" ON public.admin_users FOR ALL
  USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;

DROP POLICY IF EXISTS "public submit customer" ON public.customers;
CREATE POLICY "public submit customer" ON public.customers FOR INSERT
  WITH CHECK (
    contact_name IS NOT NULL AND email IS NOT NULL
    AND length(contact_name) BETWEEN 1 AND 200
    AND length(email) BETWEEN 3 AND 320
  );

DROP POLICY IF EXISTS "public submit booking" ON public.bookings;
CREATE POLICY "public submit booking" ON public.bookings FOR INSERT
  WITH CHECK (customer_id IS NOT NULL AND status = 'enquiry'::booking_status);

DROP POLICY IF EXISTS "public submit booking_rooms" ON public.booking_rooms;
CREATE POLICY "public submit booking_rooms" ON public.booking_rooms FOR INSERT
  WITH CHECK (
    booking_id IS NOT NULL AND room_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.status = 'enquiry'::booking_status)
  );

DROP POLICY IF EXISTS "public submit booking_extras" ON public.booking_extras;
CREATE POLICY "public submit booking_extras" ON public.booking_extras FOR INSERT
  WITH CHECK (
    booking_id IS NOT NULL AND extra_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.status = 'enquiry'::booking_status)
  );

DROP POLICY IF EXISTS "public submit booking_staff" ON public.booking_staff;
CREATE POLICY "public submit booking_staff" ON public.booking_staff FOR INSERT
  WITH CHECK (
    booking_id IS NOT NULL AND staff_role_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.status = 'enquiry'::booking_status)
  );
