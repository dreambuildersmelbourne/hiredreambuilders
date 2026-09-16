CREATE TABLE public.user_staff_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_role_id uuid NOT NULL REFERENCES public.staff_roles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, staff_role_id)
);

GRANT SELECT ON public.user_staff_roles TO authenticated;
GRANT ALL ON public.user_staff_roles TO service_role;

ALTER TABLE public.user_staff_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and admins can view staff job types"
ON public.user_staff_roles
FOR SELECT
TO authenticated
USING (
  private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'staff')
);