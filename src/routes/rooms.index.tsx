import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Users } from "lucide-react";
import { useMemo } from "react";

import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/pricing";
import { signRoomMediaPaths, resolveMediaUrl, type RoomMedia } from "@/lib/rooms";

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
    ],
  }),
  component: RoomsIndex,
});

function RoomsIndex() {
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
      return { rooms: rooms ?? [], media: (media ?? []) as unknown as RoomMedia[], signed };
    },
  });

  const rooms = roomsQ.data?.rooms ?? [];
  const media = roomsQ.data?.media ?? [];
  const signed = roomsQ.data?.signed ?? {};

  const heroByRoom = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of rooms) {
      const first = media.find((m) => m.room_id === r.id && (m.media_type === "image"));
      const url = r.hero_url || (first ? resolveMediaUrl(first, signed) : null);
      if (url) map[r.id] = url;
    }
    return map;
  }, [rooms, media, signed]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="border-b border-border bg-gradient-to-b from-muted/40 to-background">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">The venue</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Rooms &amp; spaces
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Explore every room at Dreambuilders Church — from the 250-seat main auditorium to the
            intimate lounge and welcoming foyer. Add spaces to a quote in seconds.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {roomsQ.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading rooms…
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {rooms.map((r) => (
              <Link key={r.id} to="/rooms/$slug" params={{ slug: r.slug }} className="group block">
                <Card className="overflow-hidden transition group-hover:border-primary/50 group-hover:shadow-lg">
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
                    {r.capacity && (
                      <Badge className="absolute left-3 top-3 bg-background/90 text-foreground shadow">
                        <Users className="mr-1 h-3 w-3" /> Up to {r.capacity}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-baseline justify-between">
                      <h2 className="font-display text-xl font-semibold">{r.name}</h2>
                      <span className="text-sm text-muted-foreground">
                        {Number(r.hourly_rate) > 0 ? `${money(Number(r.hourly_rate))}/hr` : "Included"}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {r.summary || r.description || "Contact us for more details about this space."}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
                      View details <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-muted/40 p-8 text-center md:flex-row md:text-left">
          <div>
            <h3 className="font-display text-xl font-semibold">Ready to book?</h3>
            <p className="text-sm text-muted-foreground">Get an instant quote for any combination of rooms.</p>
          </div>
          <Button asChild size="lg">
            <Link to="/quote">Start a quote</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
