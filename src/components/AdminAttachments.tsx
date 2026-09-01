import { useRef, useState } from "react";
import { Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const ADMIN_DOC_KINDS = [
  { value: "public_liability", label: "Public liability certificate" },
  { value: "streatrader", label: "Streatrader approval" },
  { value: "advertising", label: "Advertising material" },
  { value: "invoice", label: "Invoice" },
  { value: "paid_invoice", label: "Paid invoice / receipt" },
  { value: "contract", label: "Signed contract" },
  { value: "other", label: "Other attachment" },
] as const;

export function adminDocKindLabel(kind: string) {
  return ADMIN_DOC_KINDS.find((k) => k.value === kind)?.label ?? "Other attachment";
}

type DocRow = {
  id: string;
  kind: string;
  file_path: string;
  original_name: string | null;
  created_at: string;
};

export function AdminAttachments({
  bookingId,
  documents,
  onChanged,
}: {
  bookingId: string;
  documents: DocRow[];
  onChanged: () => void;
}) {
  const [kind, setKind] = useState<string>("paid_invoice");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in");

      for (const file of files) {
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name} is over 20 MB — please compress it.`);
          continue;
        }
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
      }
      toast.success(files.length > 1 ? "Attachments uploaded" : "Attachment uploaded");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function open(path: string) {
    const { data, error } = await supabase.storage
      .from("booking-documents")
      .createSignedUrl(path, 60);
    if (error) return toast.error(error.message);
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function remove(docId: string, path: string) {
    if (!confirm("Delete this attachment?")) return;
    const { error } = await supabase.from("documents").delete().eq("id", docId);
    if (error) return toast.error(error.message);
    await supabase.storage.from("booking-documents").remove([path]);
    toast.success("Attachment removed");
    onChanged();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-border p-4">
        <div className="min-w-[220px] flex-1">
          <Label className="text-xs">Attachment type</Label>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADMIN_DOC_KINDS.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFiles}
          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv"
        />
        <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-1.5 h-4 w-4" />
          )}
          {uploading ? "Uploading…" : "Upload files"}
        </Button>
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments on this hire yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{adminDocKindLabel(d.kind)}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {d.original_name ?? d.file_path}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => open(d.file_path)}>
                  <Paperclip className="mr-1.5 h-3.5 w-3.5" /> Open
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => remove(d.id, d.file_path)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
