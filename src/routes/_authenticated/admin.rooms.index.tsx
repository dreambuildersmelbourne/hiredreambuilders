import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/rooms/")({
  component: AdminRoomsList,
});

function AdminRoomsList() {
  const q = useQuery({
    queryKey: ["admin", "rooms-media-counts"],
    queryFn: async () => {
      const { data: rooms, error } = await supabase.from("rooms").select("*").order("sort_order");
      if (error) throw error;
      const { data: media } = await supabase.from("room_media").select("room_id, is_public");
      const counts: Record<string, { total: number; hidden: number }> = {};
      for (const m of media ?? []) {
        counts[m.room_id] ||= { total: 0, hidden: 0 };
        counts[m.room_id].total += 1;
        if (!m.is_public) counts[m.room_id].hidden += 1;
      }
      return { rooms: rooms ?? [], counts };
    },
  });

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading rooms…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Room media</h1>
        <p className="mt-1 text-muted-foreground">
          Manage photos and video walkthroughs shown on the public rooms pages.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {q.data!.rooms.map((r) => {
          const c = q.data!.counts[r.id] ?? { total: 0, hidden: 0 };
          return (
            <Link key={r.id} to="/admin/rooms/$id/media" params={{ id: r.id }} className="block">
              <Card className="transition hover:border-primary/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-semibold">{r.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <ImageIcon className="h-3.5 w-3.5" /> {c.total} media
                      {c.hidden > 0 && <Badge variant="outline" className="text-xs">{c.hidden} hidden</Badge>}
                      {!r.active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
