import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  CheckCircle2,
  ChevronLeft,
  FileText,
  Loader2,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/pricing";
import { statusMeta, DOC_KINDS, type DocKind } from "@/lib/booking-meta";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/_authenticated/account/bookings/$id")({
  component: CustomerBookingDetail,
});

function CustomerBookingDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const bookingQ = useQuery({
    queryKey: ["account", "booking", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "*, customers(*), booking_rooms(*, rooms(name, hourly_rate)), booking_extras(*, extras(name)), booking_staff(*, staff_roles(label))",
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const docsQ = useQuery({
    queryKey: ["account", "documents", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("booking_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const contractQ = useQuery({
    queryKey: ["account", "contract", id],
    queryFn: async () => {
      const { data: existing, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("booking_id", id)
        .maybeSingle();
      if (error) throw error;
      if (existing) return existing;
      const { data: created, error: cErr } = await supabase
        .from("contracts")
        .insert({ booking_id: id, version: "v1.1" })
        .select("*")
        .single();
      if (cErr) throw cErr;
      return created;
    },
  });

  if (bookingQ.isLoading || !bookingQ.data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const b = bookingQ.data;
  const s = statusMeta(b.status);
  const c = b.customers;

  return (
    <div className="space-y-6">
      <Link
        to="/account"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to my bookings
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{b.reference}</div>
          <h1 className="mt-1 font-display text-3xl font-semibold">{b.event_name}</h1>
          <p className="mt-1 text-muted-foreground">
            {format(new Date(b.event_date), "EEEE d MMMM yyyy")} · {b.bump_in_time?.slice(0, 5)}–
            {b.bump_out_time?.slice(0, 5)}
          </p>
        </div>
        <Badge variant="outline" className={`${s.className} text-sm`}>
          {s.label}
        </Badge>
      </header>

      {b.status === "info_requested" && b.info_request_message && (
        <Alert>
          <AlertTitle>The hire coordinator has asked for more information</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{b.info_request_message}</AlertDescription>
        </Alert>
      )}
      {b.status === "rejected" && (
        <Alert variant="destructive">
          <AlertTitle>This enquiry was declined</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">
            {b.rejection_reason || "Please contact the hire coordinator for more information."}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Documents
            bookingId={id}
            docs={docsQ.data ?? []}
            loading={docsQ.isLoading}
            onChanged={() => qc.invalidateQueries({ queryKey: ["account", "documents", id] })}
            foodServed={b.food_served}
          />

          <Contract booking={b} contract={contractQ.data} onChanged={() => qc.invalidateQueries({ queryKey: ["account", "contract", id] })} />
        </div>

        <div>
          <Card className="lg:sticky lg:top-24">
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold">Quote</h2>
              <div className="mt-4 space-y-1.5 text-sm">
                <Row label="Room hire" value={money(Number(b.room_subtotal))} />
                <Row label="Extras" value={money(Number(b.extras_subtotal))} />
                <Row label="Cleaning" value={money(Number(b.cleaning_subtotal))} />
                <Row label="Staff" value={money(Number(b.staff_subtotal))} />
                {Number(b.discount_amount) > 0 && (
                  <Row label={`Discount${b.discount_reason ? ` — ${b.discount_reason}` : ""}`} value={`- ${money(Number(b.discount_amount))}`} />
                )}
                <div className="my-2 border-t border-border" />
                <Row label="Subtotal (ex bond)" value={money(Number(b.subtotal_ex_bond) - Number(b.discount_amount ?? 0))} bold />
                <Row label="Bond" value={money(Number(b.bond))} />
                <Row label="20% deposit" value={money(Number(b.deposit_amount))} muted />
                <div className="my-2 border-t border-border" />
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-base font-semibold">Total</span>
                  <span className="font-display text-2xl font-semibold text-primary">
                    {money(Number(b.total_amount) - Number(b.discount_amount ?? 0))}
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-1 text-xs text-muted-foreground">
                <PayStatus label="Deposit" paid={!!b.deposit_paid_at} at={b.deposit_paid_at} />
                <PayStatus label="Balance" paid={!!b.balance_paid_at} at={b.balance_paid_at} />
                <PayStatus label="Staffing" paid={!!b.staffing_confirmed_at} at={b.staffing_confirmed_at} verb="confirmed" />
              </div>

              <div className="mt-6 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                Contact: {c?.contact_name} · {c?.email}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PayStatus({ label, paid, at, verb = "paid" }: { label: string; paid: boolean; at?: string | null; verb?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={paid ? "text-emerald-600 font-medium" : ""}>
        {paid ? `${verb} ${at ? format(new Date(at), "d MMM") : ""}` : "pending"}
      </span>
    </div>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between ${bold ? "font-semibold" : ""} ${muted ? "text-muted-foreground" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

// ============ Documents ============

function Documents({
  bookingId,
  docs,
  loading,
  onChanged,
  foodServed,
}: {
  bookingId: string;
  docs: any[];
  loading: boolean;
  onChanged: () => void;
  foodServed: boolean;
}) {
  const requiredKinds: DocKind[] = ["public_liability", ...(foodServed ? (["streatrader"] as DocKind[]) : [])];
  const hasKind = (k: string) => docs.some((d) => d.kind === k);

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="font-display text-lg font-semibold">Documents</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload the required documents so we can approve your booking.
        </p>

        <div className="mt-5 space-y-4">
          {DOC_KINDS.map((k) => {
            const required = requiredKinds.includes(k.v as DocKind);
            return (
              <DocRow
                key={k.v}
                bookingId={bookingId}
                kind={k.v}
                label={k.label}
                hint={k.hint}
                required={required}
                uploaded={hasKind(k.v)}
                docs={docs.filter((d) => d.kind === k.v)}
                onChanged={onChanged}
              />
            );
          })}
        </div>
        {loading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading documents…
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DocRow({
  bookingId,
  kind,
  label,
  hint,
  required,
  uploaded,
  docs,
  onChanged,
}: {
  bookingId: string;
  kind: string;
  label: string;
  hint: string;
  required: boolean;
  uploaded: boolean;
  docs: any[];
  onChanged: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File is over 20 MB — please compress it and try again.");
      return;
    }
    setUploading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in");

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const objectPath = `${bookingId}/${crypto.randomUUID()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("booking-documents")
        .upload(objectPath, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("documents").insert({
        booking_id: bookingId,
        kind,
        file_path: objectPath,
        original_name: file.name,
        uploaded_by: uid,
      });
      if (insErr) {
        await supabase.storage.from("booking-documents").remove([objectPath]);
        throw insErr;
      }
      toast.success("Document uploaded");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function download(path: string, name: string | null) {
    const { data, error } = await supabase.storage.from("booking-documents").createSignedUrl(path, 60);
    if (error) return toast.error(error.message);
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name ?? "document";
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function remove(docId: string, path: string) {
    if (!confirm("Delete this file?")) return;
    const { error } = await supabase.from("documents").delete().eq("id", docId);
    if (error) return toast.error(error.message);
    await supabase.storage.from("booking-documents").remove([path]);
    toast.success("Removed");
    onChanged();
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="font-medium">{label}</div>
            {required && (
              <Badge variant="outline" className="border-brand/40 bg-brand/10 text-brand">
                Required
              </Badge>
            )}
            {uploaded && (
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Uploaded
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
          <Button variant="secondary" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
            {uploaded ? "Add another" : "Upload"}
          </Button>
        </div>
      </div>
      {docs.length > 0 && (
        <ul className="mt-3 divide-y divide-border rounded-md border border-border bg-muted/40">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <button
                onClick={() => download(d.file_path, d.original_name)}
                className="inline-flex min-w-0 items-center gap-2 truncate text-left text-primary hover:underline"
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{d.original_name ?? d.file_path.split("/").pop()}</span>
              </button>
              <button
                onClick={() => remove(d.id, d.file_path)}
                className="text-xs text-muted-foreground hover:text-destructive"
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============ Contract ============

function Contract({
  booking,
  contract,
  onChanged,
}: {
  booking: any;
  contract: any;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [signing, setSigning] = useState(false);
  const signed = !!contract?.signed_at;

  useEffect(() => {
    if (contract?.signed_name) setName(contract.signed_name);
  }, [contract?.signed_name]);

  const eligibleToSign = ["approved", "reviewing", "staffing_confirmed", "invoiced", "deposit_paid", "confirmed"].includes(booking.status);

  async function sign() {
    if (!name.trim()) {
      toast.error("Type your full name to sign");
      return;
    }
    if (!contract?.id) return;
    setSigning(true);
    const { error } = await supabase
      .from("contracts")
      .update({ signed_at: new Date().toISOString(), signed_name: name.trim() })
      .eq("id", contract.id);
    setSigning(false);
    if (error) return toast.error(error.message);
    toast.success("Contract signed. Thank you.");
    onChanged();
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Hire contract</h2>
          {signed && (
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Signed
            </Badge>
          )}
        </div>

        <ContractBody booking={booking} contract={contract} />

        {!signed ? (
          <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
            {!eligibleToSign ? (
              <p className="text-sm text-muted-foreground">
                You can sign the contract once your booking has been reviewed and approved.
              </p>
            ) : (
              <>
                <Label htmlFor="signature" className="text-sm font-medium">
                  Type your full name to sign this contract
                </Label>
                <div className="mt-2 flex gap-2">
                  <Input
                    id="signature"
                    placeholder="Full legal name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 font-display text-lg italic"
                  />
                  <Button onClick={sign} disabled={signing}>
                    {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign contract"}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  By typing your name and clicking Sign, you agree you are authorised to enter this hire agreement
                  on behalf of the hirer and accept its terms.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            Signed by <strong className="font-display italic">{contract.signed_name}</strong> on{" "}
            {format(new Date(contract.signed_at), "d MMMM yyyy 'at' h:mma")}.
            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                Print / save PDF
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContractBody({ booking, contract }: { booking: any; contract: any }) {
  const c = booking.customers;
  const requirements: string[] = [];
  if (booking.food_served) requirements.push("Food will be served (additional cleaning applies)");
  if (booking.sound_system) requirements.push("Sound system");
  if (booking.av_screens) requirements.push("AV screens");
  if (booking.theatre_lighting) requirements.push("Theatre lighting");
  if (booking.seating_changes) requirements.push("Extra / changed seating");
  if (booking.remove_drums) requirements.push("Remove drums from stage");
  if (booking.kitchen) requirements.push("Kitchen access");
  if (booking.extra_staff_count > 0) requirements.push(`${booking.extra_staff_count} extra Dreambuilders crew`);

  const discount = Number(booking.discount_amount ?? 0);
  const netSubtotal = Number(booking.subtotal_ex_bond) - discount;
  const netTotal = Number(booking.total_amount) - discount;

  return (
    <div className="mt-5 rounded-lg border border-border bg-background p-6 text-sm leading-relaxed">
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Dreambuilders Church — Venue Hire Agreement
        </div>
        <div className="mt-1 font-display text-xl font-semibold">
          Contract {booking.reference}
        </div>
        <div className="text-xs text-muted-foreground">Version {contract?.version ?? "v1.1"}</div>
      </div>

      <section className="mt-6">
        <SectionTitle>1. Parties</SectionTitle>
        <p>
          This agreement is made between <strong>Dreambuilders Church</strong> (the Venue) and{" "}
          <strong>{c?.organisation || c?.contact_name}</strong> (the Hirer), represented by{" "}
          {c?.contact_name} ({c?.email}
          {c?.phone ? `, ${c.phone}` : ""}).
        </p>
      </section>

      <section className="mt-5">
        <SectionTitle>2. Event & rooms</SectionTitle>
        <dl className="grid gap-2 sm:grid-cols-2">
          <Def label="Event">{booking.event_name}</Def>
          <Def label="Date">{format(new Date(booking.event_date), "EEEE d MMMM yyyy")}</Def>
          <Def label="Bump in / out">
            {booking.bump_in_time?.slice(0, 5)} – {booking.bump_out_time?.slice(0, 5)} ({booking.hours}h)
          </Def>
          <Def label="Estimated attendance">{booking.estimated_attendance ?? "—"}</Def>
        </dl>
        <div className="mt-3">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rooms</div>
          <ul className="mt-1 list-disc pl-5">
            {booking.booking_rooms?.map((br: any) => (
              <li key={br.id}>
                {br.rooms?.name}
                {br.hours > 0 ? ` — ${br.hours}h @ $${br.rooms?.hourly_rate}/hr` : ""} = {money(Number(br.line_total))}
              </li>
            ))}
          </ul>
        </div>
        {requirements.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Requirements</div>
            <ul className="mt-1 list-disc pl-5">
              {requirements.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-5">
        <SectionTitle>3. Fees</SectionTitle>
        <div className="rounded-md border border-border">
          <FeeRow label="Room hire" v={Number(booking.room_subtotal)} />
          <FeeRow label="Extras" v={Number(booking.extras_subtotal)} />
          <FeeRow label="Cleaning" v={Number(booking.cleaning_subtotal)} />
          <FeeRow label="Staff" v={Number(booking.staff_subtotal)} />
          {discount > 0 && (
            <FeeRow label={`Discount${booking.discount_reason ? ` (${booking.discount_reason})` : ""}`} v={-discount} />
          )}
          <FeeRow label="Subtotal (ex bond)" v={netSubtotal} bold />
          <FeeRow label="Refundable bond" v={Number(booking.bond)} />
          <FeeRow label="Total payable" v={netTotal} bold />
          <FeeRow label="20% deposit due to confirm" v={Number(booking.deposit_amount)} muted />
        </div>
      </section>

      <section className="mt-5">
        <SectionTitle>4. Payment terms</SectionTitle>
        <p>
          A 20% deposit is required to confirm the booking. The remaining balance and bond are due no later than
          14 days before the event date. The bond is refundable within 14 days after the event, less any deductions
          for damage or breach of these terms.
        </p>
      </section>

      <section className="mt-5">
        <SectionTitle>5. Insurance & compliance</SectionTitle>
        <p>
          The Hirer must provide a current Certificate of Public Liability Insurance for a minimum of $20M cover.
          Where food is prepared, served or sold, the Hirer must hold a valid Streatrader / local council food
          registration. All advertising material must be approved by the Venue prior to distribution.
        </p>
      </section>

      <section className="mt-5">
        <SectionTitle>6. Cancellation</SectionTitle>
        <p>
          Cancellations more than 30 days before the event forfeit 50% of the deposit. Cancellations within 30 days
          forfeit the full deposit. Cancellations within 7 days of the event forfeit all fees paid.
        </p>
      </section>

      <section className="mt-5">
        <SectionTitle>7. Conduct</SectionTitle>
        <p>
          The Hirer is responsible for the conduct of all attendees. Alcohol is not permitted on the premises without
          prior written consent. The Venue reserves the right to end an event without refund if these terms are
          breached.
        </p>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 font-display text-sm font-semibold uppercase tracking-wider">{children}</div>;
}

function Def({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function FeeRow({ label, v, bold, muted }: { label: string; v: number; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between border-b border-border px-3 py-1.5 last:border-b-0 ${bold ? "font-semibold" : ""} ${muted ? "text-muted-foreground text-xs" : ""}`}>
      <span>{label}</span>
      <span>{money(v)}</span>
    </div>
  );
}
