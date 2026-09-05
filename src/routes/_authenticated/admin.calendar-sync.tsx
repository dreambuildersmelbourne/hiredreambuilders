import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, RefreshCw, Loader2, ExternalLink, Apple, Calendar as CalendarIcon, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CALENDAR_STATUS_META, type CalendarStatus } from "@/lib/calendar-status";

export const Route = createFileRoute("/_authenticated/admin/calendar-sync")({
  head: () => ({
    meta: [
      { title: "Calendar sync — Dreambuilders Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CalendarSyncPage,
});

const ALL_BUCKETS: CalendarStatus[] = [
  "quote_created",
  "tentative",
  "pending_approval",
  "confirmed",
  "completed",
  "cancelled",
];

function CalendarSyncPage() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const q = useQuery({
    queryKey: ["admin", "calendar-sync-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_sync_settings")
        .select("*")
        .eq("singleton", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const settings = q.data;

  const feedUrl = useMemo(() => {
    if (!settings?.feed_token || typeof window === "undefined") return "";
    return `${window.location.origin}/api/public/calendar/${settings.feed_token}/feed.ics`;
  }, [settings?.feed_token]);

  const runSheetUrl = useMemo(() => {
    if (!settings?.feed_token || typeof window === "undefined") return "";
    return `${window.location.origin}/schedule/${settings.feed_token}`;
  }, [settings?.feed_token]);

  const webcalUrl = useMemo(
    () => (feedUrl ? feedUrl.replace(/^https?:/, "webcal:") : ""),
    [feedUrl],
  );

  const googleUrl = useMemo(
    () =>
      feedUrl
        ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`
        : "",
    [feedUrl],
  );

  const outlookUrl = useMemo(
    () =>
      feedUrl
        ? `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(feedUrl)}&name=${encodeURIComponent("Dreambuilders hire")}`
        : "",
    [feedUrl],
  );

  type SyncPatch = {
    include_statuses?: string[];
    include_tentative?: boolean;
    include_cancelled?: boolean;
    include_contact_details?: boolean;
    include_internal_notes?: boolean;
    feed_token?: string;
  };
  const savePatch = useMutation({
    mutationFn: async (patch: SyncPatch) => {
      if (!settings) return;
      setSaving(true);
      const { error } = await supabase
        .from("calendar_sync_settings")
        .update(patch)
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "calendar-sync-settings"] });
      toast.success("Calendar sync updated");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not update"),
    onSettled: () => setSaving(false),
  });

  const regenerate = useMutation({
    mutationFn: async () => {
      if (!settings) return;
      // Generate a fresh 48-hex-char token client-side
      const bytes = new Uint8Array(24);
      crypto.getRandomValues(bytes);
      const token = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const { error } = await supabase
        .from("calendar_sync_settings")
        .update({ feed_token: token })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "calendar-sync-settings"] });
      toast.success("New private feed URL generated. Update any calendar subscriptions.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not regenerate"),
  });

  if (q.isLoading || !settings) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading sync settings…
      </div>
    );
  }

  const toggleBucket = (b: CalendarStatus, on: boolean) => {
    const next = new Set<string>(settings.include_statuses ?? []);
    if (on) next.add(b);
    else next.delete(b);
    savePatch.mutate({ include_statuses: Array.from(next) });
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy — select the URL and copy manually");
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Calendar sync</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Publish a private, token-protected calendar feed of hire bookings that admins can
          subscribe to from Google Calendar, Apple Calendar or Outlook. Updates flow through
          automatically the next time each app refreshes its subscription.
        </p>
      </div>

      {/* Private feed URL */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="font-display text-lg font-semibold">Private calendar feed URL</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Keep this URL confidential — anyone with it can subscribe. Regenerate to revoke
              access for old subscriptions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input value={feedUrl} readOnly className="flex-1 font-mono text-xs" />
            <Button variant="outline" onClick={() => copy(feedUrl)}>
              <Copy className="mr-1.5 h-4 w-4" /> Copy
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Regenerate the private feed URL? Existing subscriptions will stop updating.")) {
                  regenerate.mutate();
                }
              }}
              disabled={regenerate.isPending}
            >
              <RefreshCw className={`mr-1.5 h-4 w-4 ${regenerate.isPending ? "animate-spin" : ""}`} /> Regenerate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Run sheet links */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="font-display text-lg font-semibold">Run sheet links (no login needed)</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              A private page listing every approved and confirmed hire, with a shareable link per
              hire showing contact details, spaces, crew and the event day checklist. Paste those
              links into your Google Calendar event descriptions. Uses the same private token — it
              is not indexed and is revoked when you regenerate above.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input value={runSheetUrl} readOnly className="flex-1 font-mono text-xs" />
            <Button variant="outline" onClick={() => copy(runSheetUrl)}>
              <Copy className="mr-1.5 h-4 w-4" /> Copy
            </Button>
            <Button variant="outline" asChild>
              <a href={runSheetUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" /> Open
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* What's included */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="font-display text-lg font-semibold">What appears in the feed</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose which booking statuses and details are exported. Cancelled bookings show as
              cancelled in the calendar; tentative bookings show as tentative.
            </p>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Booking statuses
            </Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {ALL_BUCKETS.map((b) => {
                const on = (settings.include_statuses ?? []).includes(b);
                const meta = CALENDAR_STATUS_META[b];
                return (
                  <label
                    key={b}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={on}
                      onCheckedChange={(v) => toggleBucket(b, !!v)}
                      disabled={saving}
                    />
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </label>
                );
              })}
            </div>
          </div>

          <Separator />

          <div className="grid gap-3">
            <ToggleRow
              label="Include tentative bookings"
              hint="Tentative holds appear in the calendar as TENTATIVE."
              checked={settings.include_tentative}
              onChange={(v) => savePatch.mutate({ include_tentative: v })}
              disabled={saving}
            />
            <ToggleRow
              label="Include cancelled bookings"
              hint="Show cancellations in the feed for audit purposes."
              checked={settings.include_cancelled}
              onChange={(v) => savePatch.mutate({ include_cancelled: v })}
              disabled={saving}
            />
            <ToggleRow
              label="Include customer contact details"
              hint="Adds customer name, email and phone to the event description. Leave off if the subscribing calendar is shared."
              checked={settings.include_contact_details}
              onChange={(v) => savePatch.mutate({ include_contact_details: v })}
              disabled={saving}
            />
            <ToggleRow
              label="Include internal admin notes"
              hint="Adds internal notes to the event description. Admin-only calendars only."
              checked={settings.include_internal_notes}
              onChange={(v) => savePatch.mutate({ include_internal_notes: v })}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Google Calendar */}
      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Google Calendar</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Subscribe your Google Calendar to the private feed above. Google refreshes external
            calendars every few hours — booking changes flow through automatically.
          </p>
          <ol className="ml-5 list-decimal space-y-1 text-sm text-muted-foreground">
            <li>Click <strong>Connect Google Calendar</strong> below.</li>
            <li>Sign in to Google if prompted, then confirm the subscription.</li>
            <li>Choose which of your Google Calendars to add it to from Google Calendar settings.</li>
          </ol>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href={googleUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" /> Connect Google Calendar
              </a>
            </Button>
            <Button variant="outline" onClick={() => copy(feedUrl)}>
              <Copy className="mr-1.5 h-4 w-4" /> Copy feed URL
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Apple Calendar */}
      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-center gap-2">
            <Apple className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Apple Calendar / iPhone Calendar</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Copy this link and subscribe to it in Apple Calendar or iPhone Calendar.
          </p>
          <div className="flex flex-wrap gap-2">
            <Input value={webcalUrl} readOnly className="flex-1 font-mono text-xs" />
            <Button variant="outline" onClick={() => copy(webcalUrl)}>
              <Copy className="mr-1.5 h-4 w-4" /> Copy
            </Button>
            <Button asChild>
              <a href={webcalUrl}>
                <ExternalLink className="mr-1.5 h-4 w-4" /> Subscribe on this device
              </a>
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            <strong>On macOS:</strong> Calendar → File → New Calendar Subscription → paste the link.
            <br />
            <strong>On iPhone/iPad:</strong> Settings → Calendar → Accounts → Add Account → Other →
            Add Subscribed Calendar → paste the link.
          </div>
        </CardContent>
      </Card>

      {/* Outlook */}
      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Outlook Calendar</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Outlook can subscribe to the ICS feed. Click below for Outlook.com, or in the desktop
            app use <em>Add calendar → Subscribe from web</em> and paste the feed URL.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href={outlookUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" /> Subscribe in Outlook.com
              </a>
            </Button>
            <Button variant="outline" onClick={() => copy(feedUrl)}>
              <Copy className="mr-1.5 h-4 w-4" /> Copy feed URL
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
        <strong>Security:</strong> the feed is protected only by the token in the URL. Never post
        it publicly, and regenerate it if you suspect it has leaked. Customer contact details and
        internal notes are only included when the toggles above are on.
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
      <Checkbox
        className="mt-0.5"
        checked={checked}
        onCheckedChange={(v) => onChange(!!v)}
        disabled={disabled}
      />
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </label>
  );
}
