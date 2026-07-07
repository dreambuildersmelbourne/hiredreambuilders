
DROP FUNCTION IF EXISTS public.generate_event_checklist(uuid);

CREATE OR REPLACE FUNCTION private.generate_event_checklist(_booking_id uuid, _actor uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b record; t record; inserted_count integer := 0; include boolean;
BEGIN
  IF NOT (private.has_role(_actor,'admin') OR private.has_role(_actor,'staff')) THEN
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

REVOKE ALL ON FUNCTION private.generate_event_checklist(uuid, uuid) FROM PUBLIC;

-- Public wrapper: SECURITY INVOKER so RLS/role check applies; delegates to private definer.
CREATE OR REPLACE FUNCTION public.generate_event_checklist(_booking_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'staff')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN private.generate_event_checklist(_booking_id, auth.uid());
END $$;

REVOKE ALL ON FUNCTION public.generate_event_checklist(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_event_checklist(uuid) TO authenticated;
