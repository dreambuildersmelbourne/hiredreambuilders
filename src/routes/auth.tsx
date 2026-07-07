import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Church, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Admin sign in — Dreambuilders Venue Hire" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        toast.success("Account created. You are signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/admin" });
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
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-white/15 backdrop-blur">
            <Church className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-semibold">Dreambuilders Admin</span>
        </div>
        <Card className="shadow-elevated">
          <CardContent className="p-6 sm:p-8">
            <h1 className="font-display text-2xl font-semibold">
              {mode === "signin" ? "Sign in" : "Create admin account"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Access the venue hire dashboard."
                : "The first account created becomes the primary admin."}
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
