import type { Player, RepeatMode } from "lavalink-client";
import { DBManager } from "../database";
import { trackLink } from "./format";

// Playback actions shared by slash commands, the now-playing buttons and the dashboard,
// so they all behave the same. Each returns a short message describing what happened.

export async function togglePause(player: Player) {
    if (player.paused) {
        await player.resume();
        return "▶️ Resumed.";
    }
    await player.pause();
    return "⏸️ Paused.";
}

export async function skip(player: Player) {
    const current = player.queue.current;
    // Nothing left: stop instead (skip would throw on an empty queue).
    if (!player.queue.tracks.length) {
        await player.stopPlaying(false, Boolean(player.get("autoplay")));
        return current ? `⏭️ Skipped ${trackLink(current)}. The queue is now empty.` : "Nothing to skip.";
    }
    await player.skip();
    return current ? `⏭️ Skipped ${trackLink(current)}.` : "⏭️ Skipped.";
}

export async function previous(player: Player) {
    const prev = await player.queue.shiftPrevious();
    if (!prev) return "There's no previous song.";

    // Put the current song back at the front, then play the previous one.
    if (player.queue.current) await player.queue.add(player.queue.current, 0);
    await player.play({ clientTrack: prev });
    return `⏮️ Playing ${trackLink(prev)} again.`;
}

export async function stop(player: Player) {
    await player.destroy("stopped");
    return "⏹️ Stopped and left the voice channel.";
}

const NEXT_LOOP: Record<RepeatMode, RepeatMode> = { off: "queue", queue: "track", track: "off" };

export async function setLoop(player: Player, mode?: RepeatMode) {
    const next = mode ?? NEXT_LOOP[player.repeatMode];
    await player.setRepeatMode(next);
    return { off: "🔁 Loop is off.", queue: "🔁 Looping the whole queue.", track: "🔂 Looping the current song." }[next];
}

export async function shuffle(player: Player) {
    if (player.queue.tracks.length < 2) return "Add more songs first, there's nothing to shuffle.";
    await player.queue.shuffle();
    return `🔀 Shuffled ${player.queue.tracks.length} songs.`;
}

// Sets the volume (clamped to the server's max).
export async function setVolume(player: Player, volume: number) {
    const { settings } = await DBManager.getGuildConfig(player.guildId);
    const v = Math.max(0, Math.min(settings.music.maxVolume, Math.round(volume)));
    await player.setVolume(v);
    return `${v === 0 ? "🔇" : v < 50 ? "🔉" : "🔊"} Volume set to **${v}%**.`;
}

export async function seek(player: Player, positionMs: number) {
    const track = player.queue.current;
    if (!track || track.info.isStream || !track.info.isSeekable) return "This song can't be seeked.";
    await player.seek(Math.max(0, Math.min(positionMs, track.info.duration - 1000)));
    return null;
}

export async function removeAt(player: Player, index: number) {
    const track = player.queue.tracks[index];
    if (!track) return null;
    await player.queue.remove(index);
    return track;
}

export async function move(player: Player, from: number, to: number) {
    const tracks = player.queue.tracks;
    const track = tracks[from];
    if (!track || to < 0 || to >= tracks.length) return null;
    await player.queue.splice(from, 1);
    await player.queue.add(track, to);
    return track;
}
