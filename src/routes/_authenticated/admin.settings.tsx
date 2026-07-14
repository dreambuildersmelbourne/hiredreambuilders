import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Mail, Globe, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

const SETTINGS_KEYS = ["notification_email", "sender_domain"];

function AdminSettings() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", SETTINGS_KEYS);
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((s) => [s.key, s.value])) as Record<string, string>;
    },
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const current = data ?? { notification_email: "", sender_domain: "" };
  const values = { ...current, ...form };

  async function save() {
    setSaving(true);
    try {
      const rows = SETTINGS_KEYS.map((key) => ({ key, value: values[key] || "" }));
      const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("Settings saved");
      await refetch();
    } catch (err) {
      console.error(err);
      toast.error("Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Admin settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Configure notification and email-sending settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Quote enquiry notifications</CardTitle>
          <CardDescription>
            When a customer submits a quote, an email is sent to this address. The sender domain must
            match the email domain configured in Lovable Cloud.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="notification_email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Notification email
                </Label>
                <Input
                  id="notification_email"
                  type="email"
                  placeholder="e.g. hire@dreambuilders.church"
                  value={values.notification_email}
                  onChange={(e) => setForm((f) => ({ ...f, notification_email: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  The staff address that receives new quote enquiry alerts.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sender_domain" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Sender domain
                </Label>
                <Input
                  id="sender_domain"
                  placeholder="e.g. notify.dreambuilders.church"
                  value={values.sender_domain}
                  onChange={(e) => setForm((f) => ({ ...f, sender_domain: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  The verified email domain your notifications are sent from.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save settings
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
