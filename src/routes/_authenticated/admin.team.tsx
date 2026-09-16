import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, ShieldCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { listTeam, setTeamRole } from "@/lib/team.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/team")({
  head: () => ({
    meta: [
      { title: "Team access — Dreambuilders Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminTeamPage,
});

function AdminTeamPage() {
  const fetchTeam = useServerFn(listTeam);
  const updateRole = useServerFn(setTeamRole);

  const teamQ = useQuery({
    queryKey: ["admin", "team"],
    queryFn: () => fetchTeam(),
  });

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [busy, setBusy] = useState(false);

  async function run(action: "grant" | "revoke", targetEmail: string, targetRole: "staff" | "admin") {
    setBusy(true);
    try {
      await updateRole({ data: { email: targetEmail, role: targetRole, action } });
      toast.success(action === "grant" ? `${targetRole} access given to ${targetEmail}` : `Removed ${targetRole} access`);
      setEmail("");
      await teamQ.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const members = teamQ.data ?? [];
  const withRoles = members.filter((m) => m.roles.length > 0);
  const withoutRoles = members.filter((m) => m.roles.length === 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Team access</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Give your people staff or admin access. Staff can see every enquiry and confirmed hire on the calendar and use
          the event-day checklists. Admins can do everything, including managing team access.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-primary" /> Give access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            They need to create an account first (sign up at the sign-in page), then enter their email here.
          </p>
          <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
            <Input
              placeholder="person@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Select value={role} onValueChange={(v) => setRole(v as "staff" | "admin")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button disabled={busy || !email.trim()} onClick={() => run("grant", email.trim(), role)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Give access"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> People with access
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamQ.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : withRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody has staff or admin access yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {withRoles.map((m) => (
                <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <div>
                    <div className="font-medium">{m.email}</div>
                    <div className="mt-1 flex gap-1.5">
                      {m.roles.map((r) => (
                        <Badge key={r} variant="outline" className="capitalize">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(["staff", "admin"] as const).map((r) =>
                      m.roles.includes(r) ? (
                        <Button
                          key={r}
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => run("revoke", m.email, r)}
                        >
                          Remove {r}
                        </Button>
                      ) : (
                        <Button
                          key={r}
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => run("grant", m.email, r)}
                        >
                          Make {r}
                        </Button>
                      ),
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" /> Other accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {withoutRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No other accounts.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {withoutRoles.map((m) => (
                <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <span>{m.email}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => run("grant", m.email, "staff")}>
                      Make staff
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => run("grant", m.email, "admin")}>
                      Make admin
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
