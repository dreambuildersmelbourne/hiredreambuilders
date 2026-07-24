
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============ TIMESTAMPS TRIGGER ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ ROOMS ============
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  hourly_rate NUMERIC(10,2) NOT NULL,
  min_hours INT NOT NULL DEFAULT 4,
  bond NUMERIC(10,2) NOT NULL DEFAULT 0,
  capacity INT,
  includes_staff BOOLEAN NOT NULL DEFAULT false,
  includes_cleaning BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rooms TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read rooms" ON public.rooms FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "admins manage rooms" ON public.rooms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER rooms_updated BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ EXTRAS ============
CREATE TYPE public.extra_pricing AS ENUM ('flat', 'per_hour', 'per_hour_per_person');

CREATE TABLE public.extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  pricing_type public.extra_pricing NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  min_hours INT NOT NULL DEFAULT 0,
  requires_room BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.extras TO anon, authenticated;
GRANT ALL ON public.extras TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.extras TO authenticated;
ALTER TABLE public.extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read extras" ON public.extras FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "admins manage extras" ON public.extras FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER extras_updated BEFORE UPDATE ON public.extras FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ STAFF ROLES ============
CREATE TABLE public.staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 80,
  min_hours INT NOT NULL DEFAULT 4,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff_roles TO anon, authenticated;
GRANT ALL ON public.staff_roles TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.staff_roles TO authenticated;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read staff roles" ON public.staff_roles FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "admins manage staff roles" ON public.staff_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ CUSTOMERS ============
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation TEXT,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
GRANT INSERT ON public.customers TO anon;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public submit customer" ON public.customers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read customers" ON public.customers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "admins manage customers" ON public.customers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete customers" ON public.customers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ BOOKINGS ============
CREATE TYPE public.booking_status AS ENUM ('enquiry', 'reviewing', 'staffing_confirmed', 'invoiced', 'deposit_paid', 'confirmed', 'completed', 'cancelled');

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE DEFAULT ('DB-' || to_char(now(), 'YYMMDD') || '-' || lpad(floor(random()*10000)::text, 4, '0')),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  bump_in_time TIME NOT NULL,
  bump_out_time TIME NOT NULL,
  estimated_attendance INT,
  food_served BOOLEAN NOT NULL DEFAULT false,
  sound_system BOOLEAN NOT NULL DEFAULT false,
  av_screens BOOLEAN NOT NULL DEFAULT false,
  theatre_lighting BOOLEAN NOT NULL DEFAULT false,
  seating_changes BOOLEAN NOT NULL DEFAULT false,
  remove_drums BOOLEAN NOT NULL DEFAULT false,
  kitchen BOOLEAN NOT NULL DEFAULT false,
  extra_staff_count INT NOT NULL DEFAULT 0,
  notes TEXT,
  hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  room_subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  extras_subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  cleaning_subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  staff_subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  bond NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal_ex_bond NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status public.booking_status NOT NULL DEFAULT 'enquiry',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
GRANT INSERT ON public.bookings TO anon;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public submit booking" ON public.bookings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "staff read bookings" ON public.bookings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "admins update bookings" ON public.bookings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete bookings" ON public.bookings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER bookings_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ BOOKING_ROOMS ============
CREATE TABLE public.booking_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id),
  hours NUMERIC(6,2) NOT NULL,
  line_total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_rooms TO authenticated;
GRANT ALL ON public.booking_rooms TO service_role;
GRANT INSERT ON public.booking_rooms TO anon;
ALTER TABLE public.booking_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public submit booking_rooms" ON public.booking_rooms FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "staff read booking_rooms" ON public.booking_rooms FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "admins manage booking_rooms" ON public.booking_rooms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ BOOKING_EXTRAS ============
CREATE TABLE public.booking_extras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  extra_id UUID NOT NULL REFERENCES public.extras(id),
  quantity NUMERIC(6,2) NOT NULL DEFAULT 1,
  line_total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_extras TO authenticated;
GRANT ALL ON public.booking_extras TO service_role;
GRANT INSERT ON public.booking_extras TO anon;
ALTER TABLE public.booking_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public submit booking_extras" ON public.booking_extras FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "staff read booking_extras" ON public.booking_extras FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "admins manage booking_extras" ON public.booking_extras FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ BOOKING_STAFF ============
CREATE TABLE public.booking_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  staff_role_id UUID NOT NULL REFERENCES public.staff_roles(id),
  count INT NOT NULL DEFAULT 1,
  hours NUMERIC(6,2) NOT NULL,
  line_total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_staff TO authenticated;
GRANT ALL ON public.booking_staff TO service_role;
GRANT INSERT ON public.booking_staff TO anon;
ALTER TABLE public.booking_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public submit booking_staff" ON public.booking_staff FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "staff read booking_staff" ON public.booking_staff FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "admins manage booking_staff" ON public.booking_staff FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ DOCUMENTS ============
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  file_path TEXT NOT NULL,
  original_name TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read documents" ON public.documents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "admins manage documents" ON public.documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ CONTRACTS ============
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  version TEXT NOT NULL DEFAULT 'v1.1',
  signed_at TIMESTAMPTZ,
  signed_name TEXT,
  file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read contracts" ON public.contracts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "admins manage contracts" ON public.contracts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ PAYMENTS ============
CREATE TYPE public.payment_kind AS ENUM ('deposit', 'balance', 'bond', 'refund', 'other');

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  kind public.payment_kind NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  paid_at TIMESTAMPTZ,
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read payments" ON public.payments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "admins manage payments" ON public.payments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ TASKS ============
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read tasks" ON public.tasks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "admins manage tasks" ON public.tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ EVENT DAY CHECKLISTS ============
CREATE TABLE public.event_day_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_day_checklists TO authenticated;
GRANT ALL ON public.event_day_checklists TO service_role;
ALTER TABLE public.event_day_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read checklists" ON public.event_day_checklists FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "admins manage checklists" ON public.event_day_checklists FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ STAFF ASSIGNMENTS ============
CREATE TABLE public.staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  staff_role_id UUID REFERENCES public.staff_roles(id),
  user_id UUID REFERENCES auth.users(id),
  name TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_assignments TO authenticated;
GRANT ALL ON public.staff_assignments TO service_role;
ALTER TABLE public.staff_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read assignments" ON public.staff_assignments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
CREATE POLICY "admins manage assignments" ON public.staff_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ ADMIN USERS ============
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self or admin read admin_users" ON public.admin_users FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage admin_users" ON public.admin_users FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ AUTO PROMOTE FIRST USER TO ADMIN ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM auth.users;
  INSERT INTO public.admin_users (user_id, email, display_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
    ON CONFLICT (user_id) DO NOTHING;
  IF user_count <= 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff')
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ SEED CATALOG ============
INSERT INTO public.rooms (slug, name, description, hourly_rate, min_hours, bond, capacity, includes_staff, includes_cleaning, sort_order) VALUES
  ('main-auditorium', 'Main Auditorium', '3 large audience screens, quality sound system, theatre lighting. Fully air-conditioned/heated.', 480, 4, 800, 250, true, true, 1),
  ('function-room-2', 'Function Room 2', 'Air-conditioned/heated. Capacity ~80.', 150, 4, 500, 80, false, false, 2),
  ('function-room-3', 'Function Room 3', 'Air-conditioned/heated, white board, flat screen TV. Capacity ~60.', 150, 4, 500, 60, false, false, 3),
  ('lounge', 'Lounge', 'Air-conditioned/heated, kitchenette. Capacity 16–30.', 150, 4, 500, 30, false, false, 4),
  ('kitchen', 'Kitchen', 'Microwaves and commercial oven. Flat fee when hired with another room.', 0, 0, 0, NULL, false, false, 5);

INSERT INTO public.extras (slug, name, description, pricing_type, amount, min_hours, requires_room, sort_order) VALUES
  ('kitchen-fee', 'Kitchen (with another room)', 'Flat fee when kitchen is hired alongside another room.', 'flat', 250, 0, true, 1),
  ('seating-change', 'Extra auditorium seating / seating changes', 'Flat fee for seating changes or additional auditorium seating.', 'flat', 200, 0, false, 2),
  ('remove-drums', 'Remove drums from stage', 'Flat fee to remove drums from the auditorium stage.', 'flat', 200, 0, false, 3),
  ('extra-cleaning', 'Additional cleaning (food served)', '$80/hr, minimum 3 hours when food is served.', 'per_hour', 80, 3, false, 4);

INSERT INTO public.staff_roles (slug, name, hourly_rate, min_hours) VALUES
  ('extra-crew', 'Extra Dreambuilders Crew', 80, 4);
