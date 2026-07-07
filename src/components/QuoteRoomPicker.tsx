import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  Play,
  Scale,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { money, type Room } from "@/lib/pricing";
import {
  resolveMediaUrl,
  signRoomMediaPaths,
  toEmbedUrl,
  type RoomMedia,
} from "@/lib/rooms";

export type RichRoom = Room & {
  summary?: string | null;
  description?: string | null;
  capacity?: number | null;
  hero_url?: string | null;
  video_url?: string | null;
  included_equipment?: string[] | null;
  best_for?: string[] | null;
  optional_extras?: string[] | null;
};

type MediaBundle = { rows: RoomMedia[]; signed: Record<string, string> };

export function QuoteRoomPicker({
  rooms,
  selectedIds,
  onToggle,
  isLoading,
}: {
  rooms: RichRoom[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  isLoading?: boolean;
}) {
  const [galleryRoom, setGalleryRoom] = useState<RichRoom | null>(null);
  const [videoRoom, setVideoRoom] = useState<RichRoom | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id],
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading rooms…
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {rooms.map((r) => (
          <RoomCard
            key={r.id}
            room={r}
            selected={selectedIds.includes(r.id)}
            compared={compareIds.includes(r.id)}
            onToggle={() => onToggle(r.id)}
            onCompare={() => toggleCompare(r.id)}
            onGallery={() => setGalleryRoom(r)}
            onVideo={() => setVideoRoom(r)}
          />
        ))}
      </div>

      {compareIds.length > 0 && (
        <div className="sticky bottom-3 z-20 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-background/95 p-3 shadow-elevated backdrop-blur">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Scale className="h-4 w-4 text-primary" />
            <span className="font-medium">Comparing {compareIds.length}:</span>
            {compareIds.map((id) => {
              const r = rooms.find((x) => x.id === id);
              if (!r) return null;
              return (
                <Badge key={id} variant="secondary" className="gap-1">
                  {r.name}
                  <button onClick={() => toggleCompare(id)} aria-label={`Remove ${r.name}`}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCompareIds([])}>
              Clear
            </Button>
            <Button size="sm" disabled={compareIds.length < 2} onClick={() => setCompareOpen(true)}>
              Compare side by side
            </Button>
          </div>
        </div>
      )}

      {galleryRoom && (
        <GalleryModal room={galleryRoom} onClose={() => setGalleryRoom(null)} />
      )}
      {videoRoom && (
        <VideoModal room={videoRoom} onClose={() => setVideoRoom(null)} />
      )}
      {compareOpen && (
        <CompareModal
          rooms={rooms.filter((r) => compareIds.includes(r.id))}
          selectedIds={selectedIds}
          onToggle={onToggle}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </div>
  );
}

function useRoomMedia(roomId: string | undefined) {
  return useQuery<MediaBundle>({
    enabled: !!roomId,
    queryKey: ["quote", "room-media", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_media")
        .select("*")
        .eq("room_id", roomId!)
        .eq("is_public", true)
        .order("is_featured", { ascending: false })
        .order("display_order");
      if (error) throw error;
      const rows = (data ?? []) as unknown as RoomMedia[];
      const paths = rows.map((m) => m.storage_path).filter((p): p is string => !!p);
      const signed = paths.length ? await signRoomMediaPaths(paths) : {};
      return { rows, signed };
    },
  });
}

function RoomCard({
  room,
  selected,
  compared,
  onToggle,
  onCompare,
  onGallery,
  onVideo,
}: {
  room: RichRoom;
  selected: boolean;
  compared: boolean;
  onToggle: () => void;
  onCompare: () => void;
  onGallery: () => void;
  onVideo: () => void;
}) {
  const media = useRoomMedia(room.id);
  const rows = media.data?.rows ?? [];
  const signed = media.data?.signed ?? {};
  const images = rows.filter((m) => m.media_type === "image");
  const featured = images.find((m) => m.is_featured) ?? images[0];
  const heroUrl = room.hero_url || (featured ? resolveMediaUrl(featured, signed) : null);
  const hasVideo = !!room.video_url || rows.some((m) => m.media_type !== "image");

  return (
    <div
      className={`overflow-hidden rounded-xl border transition ${
        selected ? "border-primary bg-primary/5 shadow-soft" : "border-border bg-card"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="relative block aspect-[16/10] w-full overflow-hidden bg-muted"
        aria-label={`${selected ? "Deselect" : "Select"} ${room.name}`}
      >
        {heroUrl ? (
          <img src={heroUrl} alt={room.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-8 w-8 opacity-40" />
          </div>
        )}
        {selected && (
          <div className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
            <Check className="h-4 w-4" />
          </div>
        )}
      </button>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-display text-base font-semibold">{room.name}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              ${room.hourly_rate}/hr · min {room.min_hours}h · bond ${room.bond}
            </div>
          </div>
          {room.capacity ? (
            <Badge variant="secondary" className="gap-1 shrink-0 whitespace-nowrap">
              <Users className="h-3 w-3" />{" "}
              {room.slug === "main-auditorium" ? "250 / 600*" : room.capacity}
            </Badge>
          ) : null}

        </div>

        {(room.summary || room.description) && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {room.summary || room.description}
          </p>
        )}

        {room.included_equipment && room.included_equipment.length > 0 && (
          <div className="mt-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Included
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {room.included_equipment.slice(0, 4).map((it, i) => (
                <span
                  key={i}
                  className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px]"
                >
                  {it}
                </span>
              ))}
              {room.included_equipment.length > 4 && (
                <span className="text-[11px] text-muted-foreground">
                  +{room.included_equipment.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={selected ? "secondary" : "default"}
            onClick={onToggle}
          >
            {selected ? "Added to quote" : "Add to quote"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onGallery}
            disabled={images.length === 0 && !room.hero_url}
          >
            <ImageIcon className="mr-1 h-3.5 w-3.5" /> Gallery
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onVideo}
            disabled={!hasVideo}
          >
            <Play className="mr-1 h-3.5 w-3.5" /> Walkthrough
          </Button>
          <label
            className={`ml-auto flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
              compared ? "border-primary bg-primary/10" : "border-border"
            }`}
          >
            <Checkbox checked={compared} onCheckedChange={onCompare} className="h-3.5 w-3.5" />
            Compare
          </label>
        </div>
      </div>
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${wide ? "max-w-6xl" : "max-w-3xl"} max-h-[90vh] overflow-y-auto rounded-2xl bg-background shadow-elevated`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function GalleryModal({ room, onClose }: { room: RichRoom; onClose: () => void }) {
  const media = useRoomMedia(room.id);
  const rows = media.data?.rows ?? [];
  const signed = media.data?.signed ?? {};
  const images = rows.filter((m) => m.media_type === "image");
  const [idx, setIdx] = useState(0);

  const current = images[idx];
  const hasImages = images.length > 0;
  const heroFallback = room.hero_url;

  return (
    <ModalShell title={`${room.name} — Gallery`} onClose={onClose} wide>
      {media.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !hasImages && !heroFallback ? (
        <p className="py-8 text-center text-muted-foreground">
          No images available for this room yet.
        </p>
      ) : (
        <>
          <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
            <img
              src={current ? resolveMediaUrl(current, signed) : heroFallback!}
              alt={current?.caption || room.name}
              className="h-full w-full object-cover"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setIdx((i) => (i + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                  aria-label="Next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
          {current?.caption && (
            <p className="mt-3 text-center text-sm text-muted-foreground">{current.caption}</p>
          )}
          {images.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {images.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => setIdx(i)}
                  className={`h-16 w-24 overflow-hidden rounded-md border-2 ${
                    i === idx ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={resolveMediaUrl(m, signed)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </ModalShell>
  );
}

function VideoModal({ room, onClose }: { room: RichRoom; onClose: () => void }) {
  const media = useRoomMedia(room.id);
  const rows = media.data?.rows ?? [];
  const signed = media.data?.signed ?? {};
  const videoRows = rows.filter((m) => m.media_type !== "image");
  const primary = room.video_url || videoRows[0]?.media_url;
  const primaryRow = videoRows[0];

  let embed: string | null = null;
  let isFile = false;
  if (primary) {
    const parsed = toEmbedUrl(primary);
    if (parsed.type === "other") {
      // treat as uploaded video file
      isFile = true;
      embed = primaryRow?.storage_path ? resolveMediaUrl(primaryRow, signed) : primary;
    } else {
      embed = parsed.embed;
    }
  }

  return (
    <ModalShell title={`${room.name} — Walkthrough`} onClose={onClose} wide>
      {media.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !embed ? (
        <p className="py-8 text-center text-muted-foreground">
          No walkthrough video available for this room yet.
        </p>
      ) : (
        <div className="aspect-video overflow-hidden rounded-lg bg-black">
          {isFile ? (
            <video src={embed} controls autoPlay className="h-full w-full" />
          ) : (
            <iframe
              src={embed}
              title={`${room.name} walkthrough`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      )}
    </ModalShell>
  );
}

function CompareModal({
  rooms,
  selectedIds,
  onToggle,
  onClose,
}: {
  rooms: RichRoom[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const rows: { label: string; render: (r: RichRoom) => React.ReactNode }[] = [
    {
      label: "Price",
      render: (r) => (
        <span>
          <span className="font-semibold">{money(r.hourly_rate)}</span>
          <span className="text-muted-foreground">/hr</span>
        </span>
      ),
    },
    { label: "Minimum booking", render: (r) => `${r.min_hours} hours` },
    { label: "Bond", render: (r) => money(r.bond) },
    {
      label: "Capacity",
      render: (r) =>
        r.slug === "main-auditorium"
          ? "Standard theatre: ~250 · Expanded: up to ~600*"
          : r.capacity
            ? `Up to ${r.capacity} guests`
            : "—",
    },

    {
      label: "Description",
      render: (r) => (
        <span className="text-sm text-muted-foreground">
          {r.summary || r.description || "—"}
        </span>
      ),
    },
    {
      label: "Included equipment",
      render: (r) => <ListCell items={r.included_equipment} />,
    },
    { label: "Best suited for", render: (r) => <ListCell items={r.best_for} /> },
    { label: "Optional extras", render: (r) => <ListCell items={r.optional_extras} /> },
  ];

  return (
    <ModalShell title="Compare rooms" onClose={onClose} wide>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-40 border-b border-border p-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                &nbsp;
              </th>
              {rooms.map((r) => (
                <th key={r.id} className="border-b border-border p-2 text-left align-top">
                  <div className="font-display text-base font-semibold">{r.name}</div>
                  <Button
                    size="sm"
                    variant={selectedIds.includes(r.id) ? "secondary" : "default"}
                    className="mt-2"
                    onClick={() => onToggle(r.id)}
                  >
                    {selectedIds.includes(r.id) ? "Added" : "Add to quote"}
                  </Button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-border/60">
                <td className="p-2 align-top text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {row.label}
                </td>
                {rooms.map((r) => (
                  <td key={r.id} className="p-2 align-top">
                    {row.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ModalShell>
  );
}

function ListCell({ items }: { items?: string[] | null }) {
  if (!items || items.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <ul className="space-y-1">
      {items.map((it, i) => (
        <li key={i} className="flex gap-1.5 text-sm">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
