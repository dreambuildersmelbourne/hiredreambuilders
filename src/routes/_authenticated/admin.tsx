import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Church, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const navItems = [
    { to: "/admin", label: "Enquiries", exact: true },
  ];

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
