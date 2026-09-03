import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Download, Loader2, PenLine, Upload } from "lucide-react";
import { toast } from "sonner";

import { ContractDocument } from "@/components/ContractDocument";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getContractByToken,
  signContractByToken,
  uploadSignedContract,
} from "@/lib/contracts.functions";

export const Route = createFileRoute("/contract/$token")({
  component: ContractSigningPage,
  head: () => ({
    meta: [
      { title: "Sign your venue hire agreement | Dreambuilders" },
      {
        name: "description",
        content:
          "Review and sign your Dreambuilders Church venue hire agreement online, or download it, sign by hand and upload the signed copy.",
      },
      { property: "og:title", content: "Sign your venue hire agreement" },
      {
        property: "og:description",
        content: "Securely review, sign or upload your Dreambuilders venue hire agreement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}

function ContractSigningPage() {
  const { token } = Route.useParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const q = useQuery({
    queryKey: ["public-contract", token],
    queryFn: () => getContractByToken({ data: { token } }),
    retry: false,
  });

  const signMut = useMutation({
    mutationFn: () => signContractByToken({ data: { token, name, email } }),
    onSuccess: () => {
      toast.success("Contract signed — thank you!");
      q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      if (!name.trim()) throw new Error("Enter your full name before uploading");
      if (file.size > 10 * 1024 * 1024) throw new Error("File is over 10 MB");
      const file_base64 = await toBase64(file);
      return uploadSignedContract({
        data: {
          token,
          name,
          file_name: file.name,
          content_type: file.type || "application/octet-stream",
          file_base64,
        },
      });
    },
    onSuccess: () => {
      toast.success("Signed copy received — thank you!");
      q.refetch();
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => {
      if (fileRef.current) fileRef.current.value = "";
    },
  });

  if (q.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">Link not valid</h1>
        <p className="mt-2 text-muted-foreground">
          This signing link has expired or is incorrect. Please contact the hire coordinator for a new link.
        </p>
      </div>
    );
  }

  const { booking, contract } = q.data as { booking: any; contract: any };
  const signed = !!contract?.signed_at;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6 print:hidden">
        <h1 className="font-display text-2xl font-semibold">Venue hire agreement</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {booking.event_name} — {booking.reference}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="mr-1.5 h-4 w-4" /> Download / print
          </Button>
        </div>
      </header>

      <ContractDocument booking={booking} contract={contract} />

      {signed ? (
        <Card className="mt-6 border-emerald-200 bg-emerald-50 print:hidden">
          <CardContent className="p-6 text-sm text-emerald-900">
            <CheckCircle2 className="mr-1.5 inline h-4 w-4" />
            Signed by <strong className="font-display italic">{contract.signed_name}</strong>
            {contract.signed_method === "upload" ? " (signed copy uploaded)" : " electronically"}. A copy has been
            saved with your booking — you can print this page for your records.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 print:hidden">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <PenLine className="h-4 w-4 text-primary" />
                <h2 className="font-display text-base font-semibold">Sign online</h2>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="sig-name">Full legal name</Label>
                  <Input
                    id="sig-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="mt-1 font-display text-lg italic"
                  />
                </div>
                <div>
                  <Label htmlFor="sig-email">Email (optional)</Label>
                  <Input
                    id="sig-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => signMut.mutate()}
                  disabled={signMut.isPending || !name.trim()}
                >
                  {signMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign contract"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  By typing your name and clicking Sign, you agree you are authorised to enter this hire agreement on
                  behalf of the hirer and accept its terms.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                <h2 className="font-display text-base font-semibold">Or upload a signed copy</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Prefer pen and paper? Use “Download / print” above, sign it, then upload the scan or photo here
                (PDF or image, up to 10 MB).
              </p>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadMut.mutate(f);
                }}
              />
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => fileRef.current?.click()}
                disabled={uploadMut.isPending}
              >
                {uploadMut.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-4 w-4" />
                )}
                {uploadMut.isPending ? "Uploading…" : "Upload signed contract"}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Enter your full name on the left first so we know who signed.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
