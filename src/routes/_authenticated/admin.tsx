import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { LogOut, Church, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Dreambuilders Venue Hire" },
      { name: "description", content: "Internal admin dashboard for Dreambuilders venue hire enquiries and bookings." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLayout,
});


function AdminLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const roleQ = useQuery({
    queryKey: ["me", "isAdmin"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      if (error) return false;
      return (data ?? []).some((r) => r.role === "admin" || r.role === "staff");
    },
  });

  useEffect(() => {
    if (roleQ.isSuccess && roleQ.data === false) {
      navigate({ to: "/account", replace: true });
    }
  }, [roleQ.isSuccess, roleQ.data, navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const navItems = [
    { to: "/admin", label: "Enquiries", exact: true },
    { to: "/admin/calendar", label: "Calendar", exact: false },
    { to: "/admin/calendar-sync", label: "Calendar sync", exact: false },
    { to: "/admin/rooms", label: "Room media", exact: false },
    { to: "/admin/settings", label: "Settings", exact: false },
    { to: "/staff", label: "Staff portal", exact: false },
  ];

  if (roleQ.isLoading || roleQ.data === false) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking access…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/admin" className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Church className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <div className="font-display text-base font-semibold">Dreambuilders</div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Admin</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1">
              {navItems.map((n) => {
                const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-1.5 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
