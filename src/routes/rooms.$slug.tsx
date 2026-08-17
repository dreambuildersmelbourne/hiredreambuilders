import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Play,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { money } from "@/lib/pricing";
import { resolveMediaUrl, signRoomMediaPaths, toEmbedUrl, type RoomMedia } from "@/lib/rooms";

export const Route = createFileRoute("/rooms/$slug")({
  component: RoomDetail,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl p-8">
      <SiteHeader />
      <div className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm">
        {(error as Error)?.message ?? "Something went wrong."}
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div>
      <SiteHeader />
      <div className="mx-auto max-w-3xl p-8 text-center">
        <h1 className="font-display text-2xl font-semibold">Room not found</h1>
        <p className="mt-2 text-muted-foreground">This room may be inactive or renamed.</p>
        <Button asChild className="mt-6"><Link to="/rooms">Back to all rooms</Link></Button>
      </div>
    </div>
  ),
  head: ({ loaderData, params }) => {
    const r: any = loaderData;
    const title = r ? `${r.name} — Dreambuilders Venue Hire` : "Room";
    const desc = r?.summary || r?.description || "Room at Dreambuilders Church available for hire.";
    const url = `https://hiredreambuilders.lovable.app/rooms/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "product" },
        ...(r?.hero_url ? [{ property: "og:image", content: r.hero_url }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: r
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                name: r.name,
                description: desc,
                url,
                ...(r.hero_url ? { image: r.hero_url } : {}),
                ...(r.capacity
                  ? { additionalProperty: [{ "@type": "PropertyValue", name: "Capacity", value: r.capacity }] }
                  : {}),
                offers: r.hourly_rate
                  ? {
                      "@type": "Offer",
                      price: r.hourly_rate,
                      priceCurrency: "AUD",
                      priceSpecification: {
                        "@type": "UnitPriceSpecification",
                        price: r.hourly_rate,
                        priceCurrency: "AUD",
                        unitCode: "HUR",
                      },
                    }
                  : undefined,
              }),
            },
          ]
        : [],
    };
  },

  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("slug", params.slug)
      .eq("active", true)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return data;
  },
});

function RoomDetail() {
  const room: any = Route.useLoaderData();
  const navigate = useNavigate();
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [videoOpen, setVideoOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<"photos" | "videos">("photos");


  const mediaQ = useQuery({
    queryKey: ["public", "room-media", room.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_media")
        .select("*")
        .eq("room_id", room.id)
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

  const media = mediaQ.data?.rows ?? [];
  const signed = mediaQ.data?.signed ?? {};

  const images = useMemo(() => media.filter((m) => m.media_type === "image"), [media]);
  const videos = useMemo(() => media.filter((m) => m.media_type !== "image"), [media]);

  const allVideos = useMemo(() => {
    const list: { key: string; url: string; thumb: string | null; caption: string | null }[] = videos.map((v) => ({
      key: v.id,
      url: resolveMediaUrl(v, signed),
      thumb: v.thumbnail_url,
      caption: v.caption,
    }));
    if (room.video_url && !list.some((v) => v.url === room.video_url)) {
      list.unshift({ key: "room-video", url: room.video_url, thumb: room.hero_url ?? null, caption: "Room walkthrough" });
    }
    return list.filter((v) => !!v.url);
  }, [videos, signed, room.video_url, room.hero_url]);

  const featured = images.find((m) => m.is_featured) ?? images[0];
  const heroUrl = room.hero_url || (featured ? resolveMediaUrl(featured, signed) : null);

  function goQuote() {
    navigate({ to: "/quote", search: { rooms: room.id } as any });
  }
  function bookInspection() {
    navigate({ to: "/quote", search: { rooms: room.id, inspection: "1" } as any });
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <Link to="/rooms" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> All rooms
          </Link>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <div className="relative overflow-hidden rounded-2xl bg-muted aspect-[16/9]">
                {heroUrl ? (
                  <img src={heroUrl} alt={room.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">No hero photo yet</div>
                )}
                {allVideos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setTab("videos"); setVideoOpen(allVideos[0].url); }}

                    className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition hover:opacity-100"
                  >
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-medium text-black shadow-lg">
                      <Play className="h-4 w-4" /> Play walkthrough
                    </span>
                  </button>
                )}
              </div>
            </div>

            <aside>
              <p className="text-xs font-medium uppercase tracking-widest text-primary">Venue space</p>
              <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">{room.name}</h1>
              <p className="mt-3 text-muted-foreground">{room.summary || room.description}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                {room.slug === "main-auditorium" ? (
                  <>
                    <Badge variant="secondary" className="text-sm">
                      <Users className="mr-1 h-3 w-3" /> Standard theatre: ~250 guests
                    </Badge>
                    <Badge variant="secondary" className="text-sm">
                      <Users className="mr-1 h-3 w-3" /> Expanded: up to ~600 guests*
                    </Badge>
                  </>
                ) : (
                  room.capacity && (
                    <Badge variant="secondary" className="text-sm">
                      <Users className="mr-1 h-3 w-3" /> Up to {room.capacity} guests
                    </Badge>
                  )
                )}
                <Badge variant="secondary" className="text-sm">
                  {Number(room.hourly_rate) > 0 ? `${money(Number(room.hourly_rate))} / hour` : "Included with hire"}
                </Badge>
                {Number(room.bond) > 0 && (
                  <Badge variant="outline" className="text-sm">Bond {money(Number(room.bond))}</Badge>
                )}
                {room.min_hours > 0 && (
                  <Badge variant="outline" className="text-sm">Min {room.min_hours}h</Badge>
                )}
              </div>
              {room.slug === "main-auditorium" && (
                <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4 text-sm">
                  <div className="font-medium">Capacity</div>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    <li>• Standard Theatre Layout: Approximately 250 guests</li>
                    <li>• Expanded Seating Layout: Up to approximately 600 guests*</li>
                  </ul>
                  <p className="mt-2 text-xs text-muted-foreground">
                    *Expanded seating requires a one-time $200 setup fee.
                  </p>
                </div>
              )}


              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Button size="lg" onClick={goQuote} className="flex-1">
                  Add to estimate
                </Button>
                <Button size="lg" variant="outline" onClick={bookInspection} className="flex-1">
                  <CalendarCheck className="mr-1.5 h-4 w-4" /> Book inspection
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Media: photos + videos */}
      {(images.length > 0 || videos.length > 0 || room.video_url) && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold">Gallery</h2>
            <div className="inline-flex rounded-lg border border-border p-1">
              <button
                type="button"
                onClick={() => setTab("photos")}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                  tab === "photos" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Photos ({images.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("videos")}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                  tab === "videos" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Videos ({allVideos.length})
              </button>
            </div>
          </div>

          {tab === "photos" ? (
            images.length > 0 ? (
              <>
                <div className="relative mt-4 overflow-hidden rounded-2xl bg-muted aspect-[16/9]">
                  <img
                    src={resolveMediaUrl(images[galleryIdx], signed)}
                    alt={images[galleryIdx].caption ?? `${room.name} photo ${galleryIdx + 1}`}
                    className="h-full w-full object-cover transition"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        aria-label="Previous"
                        onClick={() => setGalleryIdx((i) => (i - 1 + images.length) % images.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow hover:bg-background"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        aria-label="Next"
                        onClick={() => setGalleryIdx((i) => (i + 1) % images.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 shadow hover:bg-background"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                  {images[galleryIdx].caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-sm text-white">
                      {images[galleryIdx].caption}
                    </div>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                    {images.map((img, i) => (
                      <button
                        key={img.id}
                        onClick={() => setGalleryIdx(i)}
                        className={`relative h-16 w-24 flex-none overflow-hidden rounded-md border-2 transition ${
                          i === galleryIdx ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img src={resolveMediaUrl(img, signed)} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">No photos uploaded for this room yet.</p>
            )
          ) : allVideos.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allVideos.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setVideoOpen(v.url)}
                  className="group relative overflow-hidden rounded-xl bg-muted aspect-video text-left"
                >
                  {v.thumb ? (
                    <img src={v.thumb} alt={v.caption ?? `${room.name} walkthrough`} className="h-full w-full object-cover" />
                  ) : (
                    <video src={v.url} className="h-full w-full object-cover" muted preload="metadata">
                      <track kind="captions" />
                    </video>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover:bg-black/45">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black shadow">
                      <Play className="h-4 w-4" /> Play
                    </span>
                  </span>
                  {v.caption && (
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-xs text-white">
                      {v.caption}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No video walkthroughs for this room yet.</p>
          )}
        </section>
      )}


      {/* Detail cards */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          <DetailCard title="Best suited for" items={room.best_for ?? []} fallback="Meetings, seminars, ceremonies and community events." />
          <DetailCard title="Included equipment" items={room.included_equipment ?? []} fallback="Chairs, tables and standard house lighting." />
          <DetailCard title="Optional extras" items={room.optional_extras ?? []} fallback="Sound, AV screens, theatre lighting, extra staff." />
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-primary/5 p-8 text-center md:flex-row md:text-left">
          <div>
            <h3 className="font-display text-xl font-semibold">Interested in {room.name}?</h3>
            <p className="text-sm text-muted-foreground">Add it to an estimate or book a walk-through to see it in person.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={goQuote}>Add to estimate</Button>
            <Button variant="outline" onClick={bookInspection}>
              <CalendarCheck className="mr-1.5 h-4 w-4" /> Book inspection
            </Button>
          </div>
        </div>
      </section>

      {videoOpen && <VideoModal url={videoOpen} onClose={() => setVideoOpen(null)} />}
    </div>
  );
}

function DetailCard({ title, items, fallback }: { title: string; items: string[]; fallback: string }) {
  const list = items && items.length > 0 ? items : null;
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        {list ? (
          <ul className="mt-3 space-y-1.5 text-sm">
            {list.map((i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
                <span>{i}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{fallback}</p>
        )}
      </CardContent>
    </Card>
  );
}

function VideoModal({ url, onClose }: { url: string; onClose: () => void }) {
  const { embed, type } = toEmbedUrl(url);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        onClick={onClose}
        aria-label="Close video"
      >
        <X className="h-5 w-5" />
      </button>
      <div
        className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-xl bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        {type === "other" && (url.endsWith(".mp4") || url.endsWith(".webm")) ? (
          <video src={url} controls autoPlay className="h-full w-full">
            <track kind="captions" />
          </video>
        ) : type === "other" ? (
          <video src={url} controls autoPlay className="h-full w-full">
            <track kind="captions" />
          </video>
        ) : (
          <iframe
            src={embed}
            title="Room walkthrough"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
}
