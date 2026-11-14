import type { GuildMember, User } from "discord.js";
import type { Player, Track, UnresolvedTrack } from "lavalink-client";
import { music } from "./manager";
import type { MusicSettings } from "./guards";
import { requesterOf } from "./format";

// Gets (or creates and connects) the player for a member's voice channel.
export async function getOrCreatePlayer(member: GuildMember, textChannelId: string, settings: MusicSettings) {
    const existing = music!.getPlayer(member.guild.id);
    if (existing) {
        // Remember where to post updates if it changed.
        if (!existing.textChannelId) existing.textChannelId = textChannelId;
        if (!existing.connected) await existing.connect();
        return existing;
    }

    const player = music!.createPlayer({
        guildId: member.guild.id,
        voiceChannelId: member.voice.channelId!,
        textChannelId,
        selfDeaf: true,
        volume: settings.defaultVolume
    });
    await player.connect();
    return player;
}

// Adds tracks while respecting the server's queue limits. Returns how many were added and why some weren't.
export async function addTracks(player: Player, tracks: (Track | UnresolvedTrack)[], user: User, settings: MusicSettings, position?: number) {
    let room = settings.maxQueueSize - player.queue.tracks.length;
    if (settings.maxQueuePerUser > 0) {
        const mine = player.queue.tracks.filter((t) => requesterOf(t)?.id === user.id).length;
        room = Math.min(room, settings.maxQueuePerUser - mine);
    }

    const toAdd = tracks.slice(0, Math.max(0, room));
    if (toAdd.length) await player.queue.add(toAdd, position);

    const skipped = tracks.length - toAdd.length;
    const reason = skipped
        ? settings.maxQueuePerUser > 0 && room < settings.maxQueueSize - player.queue.tracks.length
            ? `you can have at most ${settings.maxQueuePerUser} songs queued`
            : `the queue is limited to ${settings.maxQueueSize} songs`
        : null;
    return { added: toAdd.length, skipped, reason };
}

// Starts playback if the player is idle.
export async function startIfIdle(player: Player) {
    if (!player.playing && !player.paused) await player.play({ paused: false });
}
