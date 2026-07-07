import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import logoAsset from "@/assets/logo-mark.jpg.asset.json";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  email: z.string().optional(),
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Dreambuilders Venue Hire" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
});

async function landingFor(userId: string): Promise<"/admin" | "/account"> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  if (roles.includes("admin") || roles.includes("staff")) return "/admin";
  return "/account";
}

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: Route.id });
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");
  const [email, setEmail] = useState(search.email ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nextPath = search.next;

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      if (nextPath) return navigate({ to: nextPath });
      const landing = await landingFor(data.session.user.id);
      navigate({ to: landing });
    });
  }, [navigate, nextPath]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + (nextPath ?? "/account") },
        });
        if (error) throw error;
        toast.success("Account created. You are signed in.");
        if (data.user) {
          if (nextPath) return navigate({ to: nextPath });
          const landing = await landingFor(data.user.id);
          navigate({ to: landing });
          return;
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (nextPath) return navigate({ to: nextPath });
        if (data.user) {
          const landing = await landingFor(data.user.id);
          navigate({ to: landing });
          return;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2.5 text-primary-foreground">
          <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-md bg-black">
            <img src={logoAsset.url} alt="Dreambuilders" className="h-full w-full object-contain" />
          </span>
          <span className="font-display text-lg font-semibold">Dreambuilders Venue Hire</span>
        </div>
        <Card className="shadow-elevated">
          <CardContent className="p-6 sm:p-8">
            <h1 className="font-display text-2xl font-semibold">
              {mode === "signin" ? "Sign in" : "Create your account"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Access your bookings, upload documents and sign your contract."
                : "Create an account to track your hire, upload documents and sign your contract."}
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>
                  No account?{" "}
                  <button className="font-medium text-primary hover:underline" onClick={() => setMode("signup")}>
                    Create one
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button className="font-medium text-primary hover:underline" onClick={() => setMode("signin")}>
                    Sign in
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
