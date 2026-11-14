import type { Track, UnresolvedTrack } from "lavalink-client";

// Small formatting helpers shared by music commands, the now-playing card and the API.

// 225000 → "3:45", 3725000 → "1:02:05"
export function formatTime(ms: number) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600), m = Math.floor(total / 60) % 60, s = total % 60;
    return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

// "1:30", "90", "1:02:30" → milliseconds. Returns null if invalid.
export function parseTime(input: string): number | null {
    const parts = input.trim().split(":").map(Number);
    if (!parts.length || parts.length > 3 || parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
    return parts.reduce((acc, n) => acc * 60 + n, 0) * 1000;
}

// ▬▬▬▬🔘▬▬▬▬▬ style progress bar.
export function progressBar(position: number, duration: number, size = 14) {
    if (!duration) return "🔴 LIVE";
    const filled = Math.min(size - 1, Math.round((position / duration) * (size - 1)));
    return `${"▬".repeat(filled)}🔘${"▬".repeat(size - 1 - filled)}`;
}

// "[Title](url) by Author" clipped for embeds.
export function trackLink(track: Track | UnresolvedTrack, max = 60) {
    const title = track.info.title.length > max ? `${track.info.title.slice(0, max - 1)}…` : track.info.title;
    const safe = title.replace(/[[\]]/g, "");
    return track.info.uri ? `[${safe}](${track.info.uri})` : safe;
}

export const trackDuration = (track: Track | UnresolvedTrack) => (track.info.isStream ? "LIVE" : formatTime(track.info.duration ?? 0));

// The user who queued a track (we store { id, username, avatar } as the requester).
export interface Requester { id: string; username: string; avatar: string }
export const requesterOf = (track: Track | UnresolvedTrack | null | undefined) => (track?.requester ?? null) as Requester | null;

// Source names → readable labels for the UI.
// A short, user-safe description of an error from the music library or node.
export function musicError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return message.slice(0, 200) || "unknown error";
}

export const SOURCE_LABELS: Record<string, string> = {
    youtube: "YouTube", youtubemusic: "YouTube Music", soundcloud: "SoundCloud", spotify: "Spotify",
    deezer: "Deezer", applemusic: "Apple Music", bandcamp: "Bandcamp", twitch: "Twitch", http: "Link"
};
