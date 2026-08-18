import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Clock3, MapPin, Sparkles, Users } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { signRoomMediaPaths, resolveMediaUrl, type RoomMedia } from "@/lib/rooms";
import { money } from "@/lib/pricing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dreambuilders Venue Hire — Auditorium, Function Rooms & Lounge" },
      {
        name: "description",
        content:
          "Hire the 250-seat Main Auditorium, Function Rooms, Lounge or commercial Kitchen at Dreambuilders Church in Hoppers Crossing. Instant online estimates.",
      },
      { property: "og:title", content: "Dreambuilders Venue Hire — Hoppers Crossing" },
      {
        property: "og:description",
        content:
          "Beautiful spaces for conferences, concerts, workshops and celebrations. Get an instant baseline estimate and submit your booking enquiry online.",
      },
      { property: "og:url", content: "https://hiredreambuilders.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://hiredreambuilders.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "Dreambuilders Church — Venue Hire",
          url: "https://hiredreambuilders.lovable.app",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Hoppers Crossing",
            addressRegion: "VIC",
            addressCountry: "AU",
          },
          priceRange: "$$",
          areaServed: "Melbourne",
        }),
      },
    ],
  }),
  component: Landing,
});

const fallbackFeatures: Record<string, string[]> = {
  "main-auditorium": ["3 large audience screens", "Quality sound system", "Theatre lighting", "Air conditioned"],
  "function-room-2": ["Air conditioned", "Flexible layout", "Great for workshops"],
  "function-room-3": ["White board", "Flat screen TV", "Air conditioned"],
  lounge: ["Kitchenette", "Intimate setting", "Air conditioned"],
  kitchen: ["Commercial appliances", "Prep space", "Ideal with events"],
};

function useHomeRooms() {
  return useQuery({
    queryKey: ["public", "home-rooms"],
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
        rooms: (rooms ?? []) as unknown as HomeRoom[],
        media: (media ?? []) as unknown as RoomMedia[],
        signed,
      };
    },
  });
}

type HomeRoom = {
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
  included_equipment: string[] | null;
};


function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="bg-hero absolute inset-0 opacity-95" aria-hidden />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 70%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px, 60px 60px",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
          <div className="max-w-2xl text-primary-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-white" /> Hoppers Crossing, VIC
            </span>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
              A welcoming space for your next event
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">
              From small meetings of 10 to large gatherings of up to 800 people, choose the space that is right for you. Explore our Auditorium, Function Rooms, Lounge and Kitchen, then get an instant estimate in under two minutes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/quote"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-primary shadow-elevated transition hover:bg-white/95"
              >
                Get an instant estimate <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:hire@dreambuilders.church"
                className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
              >
                Contact the hire coordinator
              </a>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-6 text-sm text-white/80 sm:grid-cols-3">
              <div className="flex items-center gap-2"><Users className="h-4 w-4" /> From 250 Up to 600 guests</div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> 150 parking spaces</div>
              <div className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> 4-hour minimum hire</div>
            </div>
          </div>
        </div>
      </section>

      {/* Rooms */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-brand">Our spaces</p>
            <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
              Select the room that meets your needs
            </h2>
          </div>
          <Link to="/rooms" className="hidden text-sm font-medium text-primary hover:underline sm:inline">
            Browse our rooms →
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {rooms.map((r) => (
            <div
              key={r.name}
              className={`group relative flex flex-col rounded-2xl border p-6 shadow-soft transition hover:shadow-elevated ${
                r.highlight ? "border-primary/30 bg-primary text-primary-foreground" : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between">
                <h3 className={`font-display text-xl font-semibold ${r.highlight ? "text-primary-foreground" : ""}`}>
                  {r.name}
                </h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    r.highlight
                      ? "bg-white/15 text-primary-foreground"
                      : "bg-accent text-accent-foreground"
                  }`}
                >
                  {r.price}
                </span>
              </div>
              <p className={`mt-2 text-sm ${r.highlight ? "text-white/75" : "text-muted-foreground"}`}>
                {r.capacity}
              </p>
              <ul className={`mt-5 space-y-2 text-sm ${r.highlight ? "text-white/85" : "text-foreground/85"}`}>
                {r.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        r.highlight ? "text-brand" : "text-primary"
                      }`}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-muted/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">How hire works</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", t: "Build your estimate", d: "Pick your rooms and extras. We calculate a baseline estimate on the spot." },
              { n: "02", t: "Submit your enquiry", d: "Share your event details. Our hire coordinator confirms staff availability." },
              { n: "03", t: "Pay 20% deposit", d: "Once confirmed, secure your booking with the deposit within 7 days." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div className="font-display text-3xl text-brand">{s.n}</div>
                <h3 className="mt-3 font-display text-lg font-semibold">{s.t}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="rounded-3xl bg-primary p-10 text-primary-foreground shadow-elevated sm:p-14">
          <h2 className="max-w-2xl font-display text-3xl font-semibold sm:text-4xl">
            Ready to plan your event?
          </h2>
          <p className="mt-3 max-w-xl text-white/80">
            Get an instant baseline estimate — no account needed. Our hire coordinator will follow up
            to confirm availability.
          </p>
          <Link
            to="/quote"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-primary shadow-elevated transition hover:bg-white/95"
          >
            Start my estimate <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="font-display font-semibold text-foreground">Dreambuilders Church</div>
            <div>37–43 Graham Court, Hoppers Crossing VIC 3029</div>
          </div>
          <div className="flex flex-col gap-1 sm:items-end">
            <a href="mailto:hire@dreambuilders.church" className="hover:text-foreground">hire@dreambuilders.church</a>
            <span>03 9360 9766</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
