
-- 1. Ensure required staff roles exist
INSERT INTO public.staff_roles (name, slug, hourly_rate, min_hours, active) VALUES
  ('Venue Manager', 'venue-manager', 0, 0, true),
  ('Sound Operator', 'sound-operator', 0, 0, true),
  ('Lighting Operator', 'lighting-operator', 0, 0, true),
  ('Multimedia Operator', 'multimedia-operator', 0, 0, true),
  ('Cleaner', 'cleaner', 0, 0, true),
  ('Front of House', 'front-of-house', 0, 0, true),
  ('Security', 'security', 0, 0, true)
ON CONFLICT (slug) DO NOTHING;

-- 2. Booking flag for security requirement
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS security_required boolean NOT NULL DEFAULT false;

-- 3. Extend event_day_checklists with role + category + optional notes
ALTER TABLE public.event_day_checklists
  ADD COLUMN IF NOT EXISTS staff_role_id uuid REFERENCES public.staff_roles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'during',
  ADD COLUMN IF NOT EXISTS note text;

-- 4. Checklist templates
CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_role_id uuid REFERENCES public.staff_roles(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'during',
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  condition text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.checklist_templates TO authenticated;
GRANT ALL ON public.checklist_templates TO service_role;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read templates" ON public.checklist_templates FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'staff'));
CREATE POLICY "admins manage templates" ON public.checklist_templates FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

-- 5. Damage reports
CREATE TABLE IF NOT EXISTS public.damage_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_name text,
  severity text NOT NULL DEFAULT 'minor',
  description text NOT NULL,
  location text,
  photo_paths text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.damage_reports TO authenticated;
GRANT ALL ON public.damage_reports TO service_role;
ALTER TABLE public.damage_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read damage" ON public.damage_reports FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'staff'));
CREATE POLICY "staff insert damage" ON public.damage_reports FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'staff'));
CREATE POLICY "admins update damage" ON public.damage_reports FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete damage" ON public.damage_reports FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'admin'));

-- 6. Bond release checklist state on booking
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS bond_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS bond_release_notes text;

-- 7. Seed checklist templates (idempotent-ish: skip if any exist for that role)
DO $$
DECLARE
  vm uuid; sound uuid; light uuid; mm uuid; cleaner uuid; foh uuid; sec uuid;
BEGIN
  SELECT id INTO vm FROM public.staff_roles WHERE slug='venue-manager';
  SELECT id INTO sound FROM public.staff_roles WHERE slug='sound-operator';
  SELECT id INTO light FROM public.staff_roles WHERE slug='lighting-operator';
  SELECT id INTO mm FROM public.staff_roles WHERE slug='multimedia-operator';
  SELECT id INTO cleaner FROM public.staff_roles WHERE slug='cleaner';
  SELECT id INTO foh FROM public.staff_roles WHERE slug='front-of-house';
  SELECT id INTO sec FROM public.staff_roles WHERE slug='security';

  IF NOT EXISTS (SELECT 1 FROM public.checklist_templates) THEN
    INSERT INTO public.checklist_templates (staff_role_id, category, title, sort_order, condition) VALUES
    -- Venue Manager
    (vm,'bump_in','Meet customer & walk-through venue',1,NULL),
    (vm,'bump_in','Confirm room configuration matches booking',2,NULL),
    (vm,'bump_in','Verify insurance & Streatrader documents on file',3,NULL),
    (vm,'during','Check in on event mid-way',4,NULL),
    (vm,'bump_out','Sign off bump-out with customer',5,NULL),
    (vm,'bump_out','Confirm bond release checklist',6,NULL),
    -- Sound Operator
    (sound,'bump_in','Power on sound console & amps',1,'sound_system'),
    (sound,'bump_in','Sound-check microphones and playback',2,'sound_system'),
    (sound,'during','Monitor levels throughout event',3,'sound_system'),
    (sound,'bump_out','Power down & coil cables',4,'sound_system'),
    -- Lighting Operator
    (light,'bump_in','Program lighting cues',1,'theatre_lighting'),
    (light,'bump_in','Test house & stage lighting',2,'theatre_lighting'),
    (light,'during','Operate cues during event',3,'theatre_lighting'),
    (light,'bump_out','Reset lighting desk & house lights',4,'theatre_lighting'),
    -- Multimedia Operator
    (mm,'bump_in','Test projectors and screens',1,'av_screens'),
    (mm,'bump_in','Load customer slides / videos',2,'av_screens'),
    (mm,'during','Advance slides & handle media',3,'av_screens'),
    (mm,'bump_out','Shut down projectors & pack cables',4,'av_screens'),
    -- Cleaner
    (cleaner,'bump_in','Confirm venue is presentable before customer arrives',1,NULL),
    (cleaner,'during','Restock bathrooms mid-event',2,NULL),
    (cleaner,'bump_out','Vacuum & mop rooms hired',3,NULL),
    (cleaner,'bump_out','Clean kitchen surfaces & appliances',4,'kitchen'),
    (cleaner,'bump_out','Deep clean after food service',5,'food_served'),
    (cleaner,'bump_out','Empty bins & replace liners',6,NULL),
    -- Front of House
    (foh,'bump_in','Set up welcome desk & signage',1,NULL),
    (foh,'during','Greet & direct guests',2,NULL),
    (foh,'during','Monitor entrances/exits',3,NULL),
    (foh,'bump_out','Collect lost property',4,NULL),
    -- Security
    (sec,'bump_in','Brief with venue manager',1,'security_required'),
    (sec,'during','Patrol venue perimeter',2,'security_required'),
    (sec,'during','Monitor guest behaviour & incidents',3,'security_required'),
    (sec,'bump_out','Lock down venue & final sweep',4,'security_required');
  END IF;
END $$;

-- 8. Function: generate checklist for a booking from templates + booking flags
CREATE OR REPLACE FUNCTION public.generate_event_checklist(_booking_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b record;
  t record;
  inserted_count integer := 0;
  include boolean;
BEGIN
  IF NOT (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'staff')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF b IS NULL THEN RAISE EXCEPTION 'booking not found'; END IF;

  FOR t IN SELECT * FROM public.checklist_templates WHERE active ORDER BY sort_order LOOP
    include := true;
    IF t.condition IS NOT NULL THEN
      include := CASE t.condition
        WHEN 'sound_system' THEN b.sound_system
        WHEN 'theatre_lighting' THEN b.theatre_lighting
        WHEN 'av_screens' THEN b.av_screens
        WHEN 'kitchen' THEN b.kitchen
        WHEN 'food_served' THEN b.food_served
        WHEN 'security_required' THEN b.security_required
        WHEN 'seating_changes' THEN b.seating_changes
        ELSE true END;
    END IF;
    IF include AND NOT EXISTS (
      SELECT 1 FROM public.event_day_checklists
      WHERE booking_id = _booking_id AND staff_role_id IS NOT DISTINCT FROM t.staff_role_id
        AND category = t.category AND item = t.title
    ) THEN
      INSERT INTO public.event_day_checklists (booking_id, staff_role_id, category, item, sort_order)
      VALUES (_booking_id, t.staff_role_id, t.category, t.title, t.sort_order);
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;

  RETURN inserted_count;
END $$;

REVOKE ALL ON FUNCTION public.generate_event_checklist(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_event_checklist(uuid) TO authenticated;

-- 9. Update event_day_checklists policies so assigned staff can update their own role's items
DROP POLICY IF EXISTS "staff read checklists" ON public.event_day_checklists;
CREATE POLICY "staff read checklists" ON public.event_day_checklists FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'staff'));

CREATE POLICY "assigned staff update checklists" ON public.event_day_checklists FOR UPDATE TO authenticated
  USING (
    private.has_role(auth.uid(),'admin') OR EXISTS (
      SELECT 1 FROM public.staff_assignments sa
      WHERE sa.booking_id = event_day_checklists.booking_id
        AND sa.user_id = auth.uid()
        AND (sa.staff_role_id = event_day_checklists.staff_role_id OR event_day_checklists.staff_role_id IS NULL)
    )
  )
  WITH CHECK (
    private.has_role(auth.uid(),'admin') OR EXISTS (
      SELECT 1 FROM public.staff_assignments sa
      WHERE sa.booking_id = event_day_checklists.booking_id
        AND sa.user_id = auth.uid()
        AND (sa.staff_role_id = event_day_checklists.staff_role_id OR event_day_checklists.staff_role_id IS NULL)
    )
  );
