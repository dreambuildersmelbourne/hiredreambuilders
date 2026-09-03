import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BOOKING_SELECT = "*, customers(*), booking_rooms(*, rooms(name, hourly_rate))";

function siteUrl() {
  return process.env["SITE_URL"] ?? "https://hiredreambuilders.lovable.app";
}

function newToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function assertStaff(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Unable to verify access");
  if (!(data ?? []).some((r: { role: string }) => r.role === "admin" || r.role === "staff")) {
    throw new Error("Forbidden");
  }
}

/** Create (or fetch) the contract for a booking and return its signing link. */
export const ensureContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ booking_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("contracts")
      .select("*")
      .eq("booking_id", data.booking_id)
      .maybeSingle();

    let contract = existing as any;
    if (!contract) {
      const { data: created, error } = await supabaseAdmin
        .from("contracts")
        .insert({ booking_id: data.booking_id, version: "v1.1", signing_token: newToken() } as never)
        .select("*")
        .single();
      if (error) throw new Error(`Failed to create contract: ${error.message}`);
      contract = created;
    } else if (!contract.signing_token) {
      const { data: updated, error } = await supabaseAdmin
        .from("contracts")
        .update({ signing_token: newToken() } as never)
        .eq("id", contract.id)
        .select("*")
        .single();
      if (error) throw new Error(`Failed to prepare contract: ${error.message}`);
      contract = updated;
    }

    return { contract, url: `${siteUrl()}/contract/${contract.signing_token}` };
  });

/** Email the signing link to the customer. */
export const sendContract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ booking_id: z.string().uuid(), email: z.string().email().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("id, reference, event_name, event_date, customers(contact_name, email)")
      .eq("id", data.booking_id)
      .single();
    if (bErr || !booking) throw new Error("Booking not found");

    const to = data.email ?? (booking as any).customers?.email;
    if (!to) throw new Error("No customer email on this hire — enter one to send the contract.");

    const { data: contract } = await supabaseAdmin
      .from("contracts")
      .select("*")
      .eq("booking_id", data.booking_id)
      .maybeSingle();
    if (!contract || !(contract as any).signing_token) {
      throw new Error("Generate the contract first");
    }
    const link = `${siteUrl()}/contract/${(contract as any).signing_token}`;

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Email is not configured");

    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("key, value")
      .in("key", ["sender_domain"]);
    const senderDomain = (settings ?? []).find((s) => s.key === "sender_domain")?.value;
    if (!senderDomain) throw new Error("Sender domain is not configured in settings");

    const { sendLovableEmail } = await import("@lovable.dev/email-js");

    const name = (booking as any).customers?.contact_name ?? "there";
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#1e293b;max-width:560px">
        <h2 style="font-size:20px;margin:0 0 12px">Your venue hire agreement is ready</h2>
        <p>Hi ${name},</p>
        <p>Great news — your hire <strong>${booking.event_name}</strong> (${booking.reference}) has been approved.
        Please review and sign the hire agreement using the secure link below.</p>
        <p style="margin:24px 0">
          <a href="${link}" style="background:#c99726;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">
            Review &amp; sign contract
          </a>
        </p>
        <p style="font-size:14px;color:#475569">You can sign online by typing your name, or download the agreement,
        sign it by hand and upload the signed copy on the same page.</p>
        <p style="font-size:12px;color:#94a3b8">If the button doesn't work, copy this link: ${link}</p>
      </div>`;

    const res = await sendLovableEmail(
      {
        to,
        from: `Dreambuilders Venue Hire <hire@${senderDomain}>`,
        sender_domain: senderDomain,
        subject: `Hire agreement for ${booking.event_name} (${booking.reference})`,
        html,
        text: `Your hire agreement for ${booking.event_name} (${booking.reference}) is ready to sign: ${link}`,
        purpose: "transactional",
        idempotency_key: `contract-${(contract as any).id}-${Date.now()}`,
      },
      { apiKey },
    );
    if (!res.success) throw new Error("Email provider rejected the send");

    await supabaseAdmin
      .from("contracts")
      .update({ sent_at: new Date().toISOString(), sent_to: to } as never)
      .eq("id", (contract as any).id);

    return { sent_to: to };
  });

/** Public: load a contract + booking by its signing token. */
export const getContractByToken = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(16).max(128) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: contract } = await supabaseAdmin
      .from("contracts")
      .select("*")
      .eq("signing_token" as never, data.token as never)
      .maybeSingle();
    if (!contract) throw new Error("This signing link is not valid.");

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("id", (contract as any).booking_id)
      .single();
    if (error || !booking) throw new Error("Booking not found");

    return { contract, booking };
  });

/** Public: sign electronically by typing a full name. */
export const signContractByToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        token: z.string().min(16).max(128),
        name: z.string().trim().min(2, "Enter your full name").max(120),
        email: z.string().trim().email().max(255).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: contract } = await supabaseAdmin
      .from("contracts")
      .select("*")
      .eq("signing_token" as never, data.token as never)
      .maybeSingle();
    if (!contract) throw new Error("This signing link is not valid.");
    if ((contract as any).signed_at) throw new Error("This contract has already been signed.");

    const { error } = await supabaseAdmin
      .from("contracts")
      .update({
        signed_at: new Date().toISOString(),
        signed_name: data.name.trim(),
        signed_method: "online",
        signed_email: data.email || null,
      } as never)
      .eq("id", (contract as any).id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Public: upload a hand-signed copy of the contract. */
export const uploadSignedContract = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        token: z.string().min(16).max(128),
        name: z.string().trim().min(2).max(120),
        file_name: z.string().trim().min(1).max(200),
        content_type: z.string().trim().max(120).optional(),
        file_base64: z.string().min(10).max(14_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: contract } = await supabaseAdmin
      .from("contracts")
      .select("*")
      .eq("signing_token" as never, data.token as never)
      .maybeSingle();
    if (!contract) throw new Error("This signing link is not valid.");

    const bookingId = (contract as any).booking_id as string;
    const binary = Uint8Array.from(atob(data.file_base64), (ch) => ch.charCodeAt(0));
    if (binary.byteLength > 10 * 1024 * 1024) throw new Error("File is over 10 MB");

    const safeName = data.file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${bookingId}/signed-contract-${Date.now()}-${safeName}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("booking-documents")
      .upload(path, binary, { contentType: data.content_type || "application/octet-stream", upsert: false });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    await supabaseAdmin.from("documents").insert({
      booking_id: bookingId,
      kind: "contract",
      file_path: path,
      original_name: data.file_name,
    } as never);

    const { error } = await supabaseAdmin
      .from("contracts")
      .update({
        uploaded_file_path: path,
        uploaded_at: new Date().toISOString(),
        file_path: path,
        signed_at: (contract as any).signed_at ?? new Date().toISOString(),
        signed_name: (contract as any).signed_name ?? data.name.trim(),
        signed_method: "upload",
      } as never)
      .eq("id", (contract as any).id);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
