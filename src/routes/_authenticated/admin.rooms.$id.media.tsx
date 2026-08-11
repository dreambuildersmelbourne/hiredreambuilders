import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  Eye,
  EyeOff,
  Film,
  ImageIcon,
  Loader2,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { resolveMediaUrl, signRoomMediaPaths, toEmbedUrl, type RoomMedia } from "@/lib/rooms";

export const Route = createFileRoute("/_authenticated/admin/rooms/$id/media")({
  component: AdminRoomMediaManager,
});

function AdminRoomMediaManager() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const roomQ = useQuery({
    queryKey: ["admin", "room", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const mediaQ = useQuery({
    queryKey: ["admin", "room-media", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_media")
        .select("*")
        .eq("room_id", id)
        .order("display_order");
      if (error) throw error;
      const rows = (data ?? []) as unknown as RoomMedia[];
      const paths = rows.map((m) => m.storage_path).filter((p): p is string => !!p);
      const signed = paths.length ? await signRoomMediaPaths(paths) : {};
      return { rows, signed };
    },
  });

  const rows = mediaQ.data?.rows ?? [];
  const signed = mediaQ.data?.signed ?? {};

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["admin", "room-media", id] });
    qc.invalidateQueries({ queryKey: ["public"] });
  }

  async function update(mediaId: string, patch: Partial<RoomMedia>) {
    const { error } = await supabase.from("room_media").update(patch as never).eq("id", mediaId);
    if (error) return toast.error(error.message);
    invalidate();
  }

  async function setFeatured(mediaId: string) {
    await supabase.from("room_media").update({ is_featured: false }).eq("room_id", id);
    await supabase.from("room_media").update({ is_featured: true }).eq("id", mediaId);
    toast.success("Featured updated");
    invalidate();
  }

  async function remove(m: RoomMedia) {
    if (!confirm("Delete this media?")) return;
    if (m.storage_path) {
      await supabase.storage.from("room-media").remove([m.storage_path]);
    }
    const { error } = await supabase.from("room_media").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    invalidate();
  }

  async function reorder(index: number, direction: -1 | 1) {
    const arr = [...rows];
    const target = index + direction;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    for (let i = 0; i < arr.length; i++) {
      await supabase.from("room_media").update({ display_order: i }).eq("id", arr[i].id);
    }
    invalidate();
  }

  if (roomQ.isLoading || !roomQ.data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const room = roomQ.data;

  return (
    <div className="space-y-6">
      <Link to="/admin/rooms" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> All rooms
      </Link>
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Room media</div>
        <h1 className="mt-1 font-display text-3xl font-semibold">{room.name}</h1>
        <p className="mt-1 text-muted-foreground">
          Upload photos or paste YouTube/Vimeo links. Toggle visibility to hide media from the public page.
        </p>
      </div>

      <UploadPanel roomId={id} nextOrder={rows.length} onDone={invalidate} />
      <EmbedPanel roomId={id} nextOrder={rows.length} onDone={invalidate} />

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold">Media ({rows.length})</h2>
        {mediaQ.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No media yet. Add some above.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {rows.map((m, i) => (
              <Card key={m.id} className={`overflow-hidden ${!m.is_public ? "opacity-70" : ""}`}>
                <div className="relative aspect-video w-full bg-muted">
                  {m.media_type === "image" ? (
                    <img src={resolveMediaUrl(m, signed)} alt={m.caption ?? ""} className="h-full w-full object-cover" />
                  ) : m.media_type === "video" ? (
                    <video src={resolveMediaUrl(m, signed)} controls className="h-full w-full bg-black">
                      <track kind="captions" />
                    </video>
                  ) : (
                    <iframe
                      src={toEmbedUrl(m.media_url).embed}
                      title={m.caption ?? "Room video"}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                  <div className="absolute left-2 top-2 flex gap-1">
                    {m.is_featured && (
                      <Badge className="bg-primary text-primary-foreground">
                        <Star className="mr-1 h-3 w-3" /> Featured
                      </Badge>
                    )}
                    {!m.is_public && (
                      <Badge variant="secondary">
                        <EyeOff className="mr-1 h-3 w-3" /> Hidden
                      </Badge>
                    )}
                  </div>
                </div>
                <CardContent className="space-y-3 p-4">
                  <Input
                    placeholder="Caption (optional)"
                    defaultValue={m.caption ?? ""}
                    onBlur={(e) => e.target.value !== (m.caption ?? "") && update(m.id, { caption: e.target.value || null })}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => reorder(i, -1)} disabled={i === 0}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reorder(i, 1)} disabled={i === rows.length - 1}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant={m.is_featured ? "default" : "outline"} onClick={() => setFeatured(m.id)}>
                      <Star className="mr-1 h-3.5 w-3.5" /> Feature
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => update(m.id, { is_public: !m.is_public })}>
                      {m.is_public ? (
                        <><EyeOff className="mr-1 h-3.5 w-3.5" /> Hide</>
                      ) : (
                        <><Eye className="mr-1 h-3.5 w-3.5" /> Show</>
                      )}
                    </Button>
                    <Button size="sm" variant="ghost" className="ml-auto text-destructive hover:text-destructive" onClick={() => remove(m)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UploadPanel({ roomId, nextOrder, onDone }: { roomId: string; nextOrder: number; onDone: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handle(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${roomId}/${crypto.randomUUID()}.${ext}`;
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) {
        toast.error(`Unsupported file type: ${file.name}`);
        continue;
      }
      const up = await supabase.storage.from("room-media").upload(path, file, { contentType: file.type });
      if (up.error) {
        toast.error(up.error.message);
        continue;
      }
      const { error: dbErr } = await supabase.from("room_media").insert({
        room_id: roomId,
        media_type: isImage ? "image" : "video",
        media_url: "",
        storage_path: path,
        display_order: nextOrder + ok,
        is_public: true,
      });
      if (dbErr) toast.error(dbErr.message);
      else ok++;
    }
    setBusy(false);
    if (ok > 0) toast.success(`${ok} file${ok > 1 ? "s" : ""} uploaded`);
    if (ref.current) ref.current.value = "";
    onDone();
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          <ImageIcon className="h-4 w-4" /> Upload images or videos
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">JPG, PNG, WebP for images. MP4 or WebM for video.</p>
        <div className="mt-3 flex items-center gap-2">
          <Input
            ref={ref}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            multiple
            disabled={busy}
            onChange={(e) => handle(e.target.files)}
          />
          {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </CardContent>
    </Card>
  );
}

function EmbedPanel({ roomId, nextOrder, onDone }: { roomId: string; nextOrder: number; onDone: () => void }) {
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!url.trim()) return toast.error("Paste a video link");
    setBusy(true);
    const { type } = toEmbedUrl(url.trim());
    const media_type = type === "youtube" ? "youtube" : type === "vimeo" ? "vimeo" : "video";
    const { error } = await supabase.from("room_media").insert({
      room_id: roomId,
      media_type,
      media_url: url.trim(),
      caption: caption.trim() || null,
      display_order: nextOrder,
      is_public: true,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Video link added");
    setUrl("");
    setCaption("");
    onDone();
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          <Film className="h-4 w-4" /> Embed a YouTube or Vimeo video
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <Input placeholder="https://youtube.com/watch?v=…" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Input placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
          <Button onClick={add} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add link"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
