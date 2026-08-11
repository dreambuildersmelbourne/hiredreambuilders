import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  Play,
  Scale,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { money } from "@/lib/pricing";
import {
  signRoomMediaPaths,
  resolveMediaUrl,
  toEmbedUrl,
  type RoomMedia,
} from "@/lib/rooms";

export const Route = createFileRoute("/rooms/")({
  head: () => ({
    meta: [
      { title: "Rooms & Spaces — Dreambuilders Venue Hire" },
      {
        name: "description",
        content:
          "Browse the auditorium, function rooms, lounge, kitchen and foyer available for hire at Dreambuilders Church. Photos, capacity, pricing and included equipment.",
      },
      { property: "og:title", content: "Rooms & Spaces — Dreambuilders Venue Hire" },
      {
        property: "og:description",
        content: "Every space available for hire, with capacity, pricing and photos.",
      },
      { property: "og:url", content: "https://hiredreambuilders.lovable.app/rooms" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://hiredreambuilders.lovable.app/rooms" }],
  }),
  component: RoomsIndex,
});


type Room = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  description: string | null;
  hourly_rate: number;
  min_hours: number;
  bond: number;
  capacity: number | null;
  hero_url: string | null;
  video_url: string | null;
  best_for: string[] | null;
  included_equipment: string[] | null;
  optional_extras: string[] | null;
};

const EVENT_TYPES = [
  "Weddings",
  "Concerts",
  "Conferences",
  "Community events",
  "Meetings",
  "Workshops",
  "Rehearsals",
  "Kids & youth",
];

const CAPACITY_BUCKETS = [
  { label: "Any", min: 0, max: Infinity },
  { label: "Up to 30", min: 0, max: 30 },
  { label: "30–80", min: 30, max: 80 },
  { label: "80–150", min: 80, max: 150 },
  { label: "150+", min: 150, max: Infinity },
];

const PRICE_BUCKETS = [
  { label: "Any", min: 0, max: Infinity },
  { label: "Under $75/hr", min: 0, max: 75 },
  { label: "$75–$150/hr", min: 75, max: 150 },
  { label: "$150+/hr", min: 150, max: Infinity },
];

const COMBOS: { title: string; blurb: string; match: string[][] }[] = [
  {
    title: "Auditorium + Kitchen",
    blurb: "Concerts, conferences and large gatherings with catering.",
    match: [["auditorium"], ["kitchen"]],
  },
  {
    title: "Auditorium + Lounge",
    blurb: "Main event plus a quiet green room, VIP or breakout space.",
    match: [["auditorium"], ["lounge"]],
  },
  {
    title: "Function Room 2 + Kitchen",
    blurb: "Workshops and community dinners with full kitchen access.",
    match: [["function", "2"], ["kitchen"]],
  },
  {
    title: "Function Room 3 + Lounge",
    blurb: "Small-group workshops with an adjoining hospitality space.",
    match: [["function", "3"], ["lounge"]],
  },
];

function RoomsIndex() {
  const navigate = useNavigate();
  const [eventType, setEventType] = useState<string | null>(null);
  const [capacityIdx, setCapacityIdx] = useState(0);
  const [priceIdx, setPriceIdx] = useState(0);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ room: Room; index: number } | null>(null);
  const [videoOpen, setVideoOpen] = useState<{ room: Room; url: string } | null>(null);

  const roomsQ = useQuery({
    queryKey: ["public", "rooms-with-media"],
    queryFn: async () => {
      const { data: rooms, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;

      const { data: media } = await supabase
        .from("room_media")
        .select("*")
        .eq("is_public", true)
        .order("is_featured", { ascending: false })
        .order("display_order");

      const paths = (media ?? []).map((m) => m.storage_path).filter((p): p is string => !!p);
      const signed = paths.length ? await signRoomMediaPaths(paths) : {};
      return {
        rooms: (rooms ?? []) as unknown as Room[],
        media: (media ?? []) as unknown as RoomMedia[],
        signed,
      };
    },
  });

  const rooms = roomsQ.data?.rooms ?? [];
  const media = roomsQ.data?.media ?? [];
  const signed = roomsQ.data?.signed ?? {};

  const imagesByRoom = useMemo(() => {
    const map: Record<string, RoomMedia[]> = {};
    for (const m of media) {
      if (m.media_type !== "image") continue;
      (map[m.room_id] ||= []).push(m);
    }
    return map;
  }, [media]);

  const videosByRoom = useMemo(() => {
    const map: Record<string, RoomMedia[]> = {};
    for (const m of media) {
      if (m.media_type === "image") continue;
      (map[m.room_id] ||= []).push(m);
    }
    return map;
  }, [media]);

  const heroByRoom = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of rooms) {
      const first = imagesByRoom[r.id]?.[0];
      const url = r.hero_url || (first ? resolveMediaUrl(first, signed) : null);
      if (url) map[r.id] = url;
    }
    return map;
  }, [rooms, imagesByRoom, signed]);

  const filteredRooms = useMemo(() => {
    const cap = CAPACITY_BUCKETS[capacityIdx];
    const price = PRICE_BUCKETS[priceIdx];
    return rooms.filter((r) => {
      if (eventType) {
        const tags = (r.best_for ?? []).map((t) => t.toLowerCase());
        if (!tags.some((t) => t.includes(eventType.toLowerCase()))) return false;
      }
      const rc = r.capacity ?? 0;
      if (!(rc >= cap.min && rc <= cap.max)) return false;
      const rp = Number(r.hourly_rate) || 0;
      if (!(rp >= price.min && rp <= price.max)) return false;
      return true;
    });
  }, [rooms, eventType, capacityIdx, priceIdx]);

  const walkthroughRooms = useMemo(
    () => rooms.filter((r) => r.video_url || (videosByRoom[r.id]?.length ?? 0) > 0),
    [rooms, videosByRoom],
  );

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id],
    );
  };

  const resolveCombo = (combo: (typeof COMBOS)[number]): Room[] => {
    const found: Room[] = [];
    for (const tokens of combo.match) {
      const match = rooms.find((r) => {
        const name = r.name.toLowerCase();
        const slug = r.slug.toLowerCase();
        return tokens.every((t) => name.includes(t) || slug.includes(t));
      });
      if (match) found.push(match);
    }
    return found;
  };

  const goQuote = (ids: string[] = []) => {
    if (ids.length === 0) {
      navigate({ to: "/quote" });
    } else {
      navigate({ to: "/quote", search: { rooms: ids.join(",") } as any });
    }
  };

  const clearFilters = () => {
    setEventType(null);
    setCapacityIdx(0);
    setPriceIdx(0);
  };
  const filtersActive = !!eventType || capacityIdx !== 0 || priceIdx !== 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <SiteHeader />

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-muted/40 to-background">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">The venue</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Rooms &amp; spaces
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Explore every room at Dreambuilders Church — from the 250-seat main auditorium to the
            intimate lounge and welcoming foyer. Filter, compare and add to an estimate in seconds.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-16 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="grid gap-3 sm:grid-cols-3">
              <FilterGroup label="Event type">
                <div className="flex flex-wrap gap-1.5">
                  <FilterChip active={!eventType} onClick={() => setEventType(null)}>
                    All
                  </FilterChip>
                  {EVENT_TYPES.map((t) => (
                    <FilterChip
                      key={t}
                      active={eventType === t}
                      onClick={() => setEventType(eventType === t ? null : t)}
                    >
                      {t}
                    </FilterChip>
                  ))}
                </div>
              </FilterGroup>
              <FilterGroup label="Capacity">
                <div className="flex flex-wrap gap-1.5">
                  {CAPACITY_BUCKETS.map((b, i) => (
                    <FilterChip key={b.label} active={capacityIdx === i} onClick={() => setCapacityIdx(i)}>
                      {b.label}
                    </FilterChip>
                  ))}
                </div>
              </FilterGroup>
              <FilterGroup label="Price">
                <div className="flex flex-wrap gap-1.5">
                  {PRICE_BUCKETS.map((b, i) => (
                    <FilterChip key={b.label} active={priceIdx === i} onClick={() => setPriceIdx(i)}>
                      {b.label}
                    </FilterChip>
                  ))}
                </div>
              </FilterGroup>
            </div>
            <div className="flex items-center gap-2 lg:justify-end">
              {filtersActive && (
                <Button size="sm" variant="ghost" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
              <span className="text-xs text-muted-foreground">
                {filteredRooms.length} of {rooms.length} rooms
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Rooms */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {roomsQ.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading rooms…
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            No rooms match those filters.
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={clearFilters}>Reset filters</Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredRooms.map((r) => {
              const images = imagesByRoom[r.id] ?? [];
              const hasVideo = !!r.video_url || (videosByRoom[r.id]?.length ?? 0) > 0;
              return (
                <Card
                  key={r.id}
                  className="group overflow-hidden transition hover:border-primary/50 hover:shadow-lg"
                >
                  <div className="relative aspect-[16/10] w-full bg-muted">
                    {heroByRoom[r.id] ? (
                      <img
                        src={heroByRoom[r.id]}
                        alt={r.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        No photos yet
                      </div>
                    )}
                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      {r.slug === "main-auditorium" ? (
                        <Badge className="bg-background/90 text-foreground shadow">
                          <Users className="mr-1 h-3 w-3" /> 250 std · up to 600*
                        </Badge>
                      ) : r.capacity ? (
                        <Badge className="bg-background/90 text-foreground shadow">
                          <Users className="mr-1 h-3 w-3" /> Up to {r.capacity}
                        </Badge>
                      ) : null}

                    </div>
                    <div className="absolute right-3 top-3 flex gap-1.5">
                      {images.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setLightbox({ room: r, index: 0 })}
                          className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow hover:bg-background"
                        >
                          <ImageIcon className="h-3 w-3" /> {images.length}
                        </button>
                      )}
                      {hasVideo && (
                        <button
                          type="button"
                          onClick={() =>
                            setVideoOpen({
                              room: r,
                              url: r.video_url || resolveMediaUrl(videosByRoom[r.id][0], signed),
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow hover:bg-background"
                        >
                          <Play className="h-3 w-3" /> Video
                        </button>
                      )}
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className="font-display text-xl font-semibold">{r.name}</h2>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {Number(r.hourly_rate) > 0 ? `${money(Number(r.hourly_rate))}/hr` : "Included"}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {r.summary || r.description || "Contact us for more details about this space."}
                    </p>

                    {r.best_for && r.best_for.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {r.best_for.slice(0, 4).map((t, i) => (
                          <Badge key={i} variant="secondary" className="text-[11px] font-normal">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button size="sm" onClick={() => goQuote([r.id])}>
                        Add to estimate
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/rooms/$slug" params={{ slug: r.slug }}>
                          View details <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <label
                        className={`ml-auto flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                          compareIds.includes(r.id) ? "border-primary bg-primary/10" : "border-border"
                        }`}
                      >
                        <Checkbox
                          checked={compareIds.includes(r.id)}
                          onCheckedChange={() => toggleCompare(r.id)}
                          className="h-3.5 w-3.5"
                        />
                        Compare
                      </label>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Video walkthroughs */}
      {walkthroughRooms.length > 0 && (
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-primary">
                  Take a look inside
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold">Video walkthroughs</h2>
              </div>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {walkthroughRooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() =>
                    setVideoOpen({
                      room: r,
                      url: r.video_url || resolveMediaUrl(videosByRoom[r.id][0], signed),
                    })
                  }
                  className="group relative aspect-video overflow-hidden rounded-2xl bg-muted shadow-soft"
                >
                  {heroByRoom[r.id] ? (
                    <img
                      src={heroByRoom[r.id]}
                      alt={`${r.name} walkthrough`}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-black shadow-lg transition group-hover:scale-110">
                      <Play className="ml-0.5 h-6 w-6" />
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4 text-left">
                    <div className="font-display text-lg font-semibold text-white">{r.name}</div>
                    <div className="text-xs text-white/80">Play walkthrough</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Suggested combinations */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary">
              Popular pairings
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">Suggested combinations</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Room bundles our hire coordinator recommends most. Add the whole combo to your estimate
              in one click.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {COMBOS.map((combo) => {
            const matched = resolveCombo(combo);
            const disabled = matched.length !== combo.match.length;
            return (
              <Card key={combo.title} className="overflow-hidden">
                <CardContent className="flex h-full flex-col gap-4 p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display text-lg font-semibold">{combo.title}</div>
                      <p className="text-sm text-muted-foreground">{combo.blurb}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(matched.length ? matched : combo.match.map((t) => t.join(" "))).map((r, i) => {
                      const name = typeof r === "string" ? r : r.name;
                      const key = typeof r === "string" ? i : r.id;
                      return (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {name}
                        </Badge>
                      );
                    })}
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => goQuote(matched.map((m) => m.id))}
                      disabled={disabled}
                    >
                      Add combo to estimate
                    </Button>
                    {matched.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setCompareIds(matched.map((m) => m.id))}
                      >
                        Compare these
                      </Button>
                    )}
                    {disabled && (
                      <span className="text-xs text-muted-foreground">
                        One or more rooms in this combo aren't active.
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-primary/5 p-8 text-center md:flex-row md:text-left">
          <div>
            <h3 className="font-display text-xl font-semibold">Ready to book?</h3>
            <p className="text-sm text-muted-foreground">
              Get an instant estimate for any combination of rooms.
            </p>
          </div>
          <Button size="lg" onClick={() => goQuote()}>
            Start an estimate
          </Button>
        </div>
      </section>

      {/* Compare tray */}
      {compareIds.length > 0 && (
        <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-4xl rounded-xl border border-primary/40 bg-background/95 p-3 shadow-elevated backdrop-blur sm:inset-x-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
              <Scale className="h-4 w-4 shrink-0 text-primary" />
              <span className="font-medium">Comparing {compareIds.length}:</span>
              {compareIds.map((id) => {
                const r = rooms.find((x) => x.id === id);
                if (!r) return null;
                return (
                  <Badge key={id} variant="secondary" className="gap-1">
                    <span className="truncate max-w-[10rem]">{r.name}</span>
                    <button onClick={() => toggleCompare(id)} aria-label={`Remove ${r.name}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setCompareIds([])}>
                Clear
              </Button>
              <Button size="sm" disabled={compareIds.length < 2} onClick={() => setCompareOpen(true)}>
                Compare
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Get Estimate FAB */}
      <div className="fixed bottom-6 right-6 z-30">
        <Button size="lg" className="rounded-full shadow-elevated" onClick={() => goQuote()}>
          Get estimate
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Modals */}
      {lightbox && (
        <Lightbox
          images={imagesByRoom[lightbox.room.id] ?? []}
          signed={signed}
          index={lightbox.index}
          room={lightbox.room}
          onClose={() => setLightbox(null)}
          onIndex={(i) => setLightbox({ room: lightbox.room, index: i })}
        />
      )}
      {videoOpen && (
        <VideoModal
          url={videoOpen.url}
          title={`${videoOpen.room.name} walkthrough`}
          onClose={() => setVideoOpen(null)}
        />
      )}
      {compareOpen && (
        <CompareModal
          rooms={rooms.filter((r) => compareIds.includes(r.id))}
          onClose={() => setCompareOpen(false)}
          onAddCombo={() => {
            const ids = compareIds.slice();
            setCompareOpen(false);
            goQuote(ids);
          }}
        />
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}

function ModalShell({
  onClose,
  wide,
  children,
}: {
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      <div
        className={`relative w-full ${wide ? "max-w-6xl" : "max-w-4xl"} max-h-[90vh] overflow-y-auto rounded-2xl bg-background`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Lightbox({
  images,
  signed,
  index,
  room,
  onClose,
  onIndex,
}: {
  images: RoomMedia[];
  signed: Record<string, string>;
  index: number;
  room: Room;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  if (images.length === 0) return null;
  const current = images[index];
  return (
    <ModalShell onClose={onClose} wide>
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3 px-2">
          <div className="min-w-0">
            <div className="truncate font-display text-lg font-semibold">{room.name}</div>
            <div className="text-xs text-muted-foreground">
              {index + 1} / {images.length}
            </div>
          </div>
        </div>
        <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
          <img
            src={resolveMediaUrl(current, signed)}
            alt={current.caption ?? `${room.name} photo ${index + 1}`}
            className="h-full w-full object-contain"
          />
          {images.length > 1 && (
            <>
              <button
                aria-label="Previous"
                onClick={() => onIndex((index - 1 + images.length) % images.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-black shadow hover:bg-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                aria-label="Next"
                onClick={() => onIndex((index + 1) % images.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-black shadow hover:bg-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
        {current.caption && (
          <p className="mt-3 text-center text-sm text-muted-foreground">{current.caption}</p>
        )}
        {images.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => onIndex(i)}
                className={`h-16 w-24 flex-none overflow-hidden rounded-md border-2 ${
                  i === index ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img src={resolveMediaUrl(img, signed)} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function VideoModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const { embed, type } = toEmbedUrl(url);
  return (
    <ModalShell onClose={onClose} wide>
      <div className="aspect-video overflow-hidden rounded-2xl bg-black">
        {type === "other" ? (
          <video src={url} controls autoPlay className="h-full w-full">
            <track kind="captions" />
          </video>
        ) : (
          <iframe
            src={embed}
            title={title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
    </ModalShell>
  );
}

function CompareModal({
  rooms,
  onClose,
  onAddCombo,
}: {
  rooms: Room[];
  onClose: () => void;
  onAddCombo: () => void;
}) {
  const rows: { label: string; render: (r: Room) => React.ReactNode }[] = [
    {
      label: "Price",
      render: (r) => (
        <span>
          <span className="font-semibold">{money(Number(r.hourly_rate))}</span>
          <span className="text-muted-foreground">/hr</span>
        </span>
      ),
    },
    { label: "Minimum booking", render: (r) => `${r.min_hours} hours` },
    { label: "Bond", render: (r) => money(Number(r.bond)) },
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
    { label: "Best for", render: (r) => <ListCell items={r.best_for} /> },
    { label: "Included", render: (r) => <ListCell items={r.included_equipment} /> },
    { label: "Optional extras", render: (r) => <ListCell items={r.optional_extras} /> },
  ];

  return (
    <ModalShell onClose={onClose} wide>
      <div className="border-b border-border p-5">
        <h3 className="font-display text-xl font-semibold">Compare rooms</h3>
        <p className="text-sm text-muted-foreground">Side-by-side comparison of the rooms you selected.</p>
      </div>
      <div className="overflow-x-auto p-5">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-40 border-b border-border p-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                &nbsp;
              </th>
              {rooms.map((r) => (
                <th key={r.id} className="border-b border-border p-2 text-left align-top">
                  <div className="font-display text-base font-semibold">{r.name}</div>
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
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border p-4">
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button onClick={onAddCombo}>Add all to estimate</Button>
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
