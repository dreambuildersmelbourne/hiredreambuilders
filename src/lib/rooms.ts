import { supabase } from "@/integrations/supabase/client";

export type RoomMedia = {
  id: string;
  room_id: string;
  media_type: "image" | "video" | "youtube" | "vimeo";
  media_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  display_order: number;
  is_featured: boolean;
  is_public: boolean;
  storage_path: string | null;
  created_at: string;
  updated_at: string;
};

/** Sign a batch of storage paths at once and return a map path -> URL. */
export async function signRoomMediaPaths(paths: string[]) {
  const clean = Array.from(new Set(paths.filter(Boolean)));
  if (clean.length === 0) return {} as Record<string, string>;
  const { data, error } = await supabase.storage
    .from("room-media")
    .createSignedUrls(clean, 60 * 60 * 6); // 6h
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const s of data ?? []) if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
  return map;
}

/** Resolve the visible URL for a media row (signed if stored, else media_url). */
export function resolveMediaUrl(m: Pick<RoomMedia, "storage_path" | "media_url">, signed: Record<string, string>) {
  if (m.storage_path && signed[m.storage_path]) return signed[m.storage_path];
  return m.media_url;
}

/** Extract a YouTube/Vimeo embed URL from a share URL. */
export function toEmbedUrl(url: string): { type: "youtube" | "vimeo" | "other"; embed: string } {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.slice(1);
      return { type: "youtube", embed: `https://www.youtube.com/embed/${id}` };
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return { type: "youtube", embed: `https://www.youtube.com/embed/${id}` };
      const m = u.pathname.match(/\/embed\/([^/?#]+)/);
      if (m) return { type: "youtube", embed: `https://www.youtube.com/embed/${m[1]}` };
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id) return { type: "vimeo", embed: `https://player.vimeo.com/video/${id}` };
    }
  } catch {
    /* ignore */
  }
  return { type: "other", embed: url };
}
