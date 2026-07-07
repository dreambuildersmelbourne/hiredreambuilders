import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/logo-mark.jpg.asset.json";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My account — Dreambuilders Venue Hire" },
      { name: "description", content: "Manage your Dreambuilders venue hire bookings, upload documents and sign contracts." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccountLayout,
});


function AccountLayout() {
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/account" className="flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-black">
              <img src={logoAsset.url} alt="Dreambuilders" className="h-full w-full object-contain" />
            </span>
            <div className="leading-tight">
              <div className="font-display text-base font-semibold">Dreambuilders</div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">My bookings</div>
            </div>
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-1.5 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
