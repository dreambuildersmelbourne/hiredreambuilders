import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Copy, ExternalLink, FileText, Loader2, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ensureContract, sendContract } from "@/lib/contracts.functions";

export function AdminContractCard({
  booking,
  contract,
  onChanged,
}: {
  booking: any;
  contract: any;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<"generate" | "send" | null>(null);
  const [email, setEmail] = useState<string>(booking.customers?.email ?? "");

  const link = contract?.signing_token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/contract/${contract.signing_token}`
    : null;

  async function generate() {
    setBusy("generate");
    try {
      await ensureContract({ data: { booking_id: booking.id } });
      toast.success("Contract ready to send");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create contract");
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    setBusy("send");
    try {
      await ensureContract({ data: { booking_id: booking.id } });
      const res = await sendContract({
        data: { booking_id: booking.id, ...(email.trim() ? { email: email.trim() } : {}) },
      });
      toast.success(`Contract sent to ${res.sent_to}`);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send contract");
    } finally {
      setBusy(null);
    }
  }

  async function openSignedCopy() {
    const path = contract?.uploaded_file_path ?? contract?.file_path;
    if (!path) return;
    const { data, error } = await supabase.storage.from("booking-documents").createSignedUrl(path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Hire agreement</h2>
        </div>

        {contract?.signed_at ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <CheckCircle2 className="mr-1 inline h-4 w-4" />
            Signed by <strong className="font-display italic">{contract.signed_name}</strong> on{" "}
            {format(new Date(contract.signed_at), "d MMM yyyy, h:mma")}
            {contract.signed_method === "upload" ? " (uploaded copy)" : " (online)"}
            {(contract.uploaded_file_path || contract.file_path) && (
              <Button variant="outline" size="sm" className="ml-2" onClick={openSignedCopy}>
                Open signed copy
              </Button>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {contract
              ? contract.sent_at
                ? `Sent to ${contract.sent_to ?? "the customer"} on ${format(new Date(contract.sent_at), "d MMM yyyy, h:mma")} — awaiting signature.`
                : "Contract generated but not sent yet."
              : "Generate the agreement once you've approved this hire, then send it for signature."}
          </p>
        )}

        <div className="mt-4 space-y-3">
          {!contract?.signing_token ? (
            <Button onClick={generate} disabled={busy !== null}>
              {busy === "generate" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-4 w-4" />
              )}
              Generate contract
            </Button>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <a href={link!} target="_blank" rel="noopener">
                    <ExternalLink className="mr-1.5 h-4 w-4" /> View / download
                  </a>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(link!);
                    toast.success("Signing link copied");
                  }}
                >
                  <Copy className="mr-1.5 h-4 w-4" /> Copy signing link
                </Button>
              </div>

              {!contract.signed_at && (
                <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3">
                  <div className="min-w-[220px] flex-1">
                    <Label className="text-xs">Send to</Label>
                    <Input
                      className="mt-1"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="customer@example.com"
                    />
                  </div>
                  <Button onClick={send} disabled={busy !== null}>
                    {busy === "send" ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="mr-1.5 h-4 w-4" />
                    )}
                    {contract.sent_at ? "Resend contract" : "Send contract"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
