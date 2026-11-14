import { PermissionFlagsBits, type GuildMember, type VoiceBasedChannel } from "discord.js";
import type { Player } from "lavalink-client";
import { DBManager } from "../database";
import type { GuildSettings } from "../settings";
import { music } from "./manager";
import { requesterOf } from "./format";

// Permission and state checks shared by every music command, button and the dashboard API.
// Each returns an error message to show, or null if everything is fine.

export type MusicSettings = GuildSettings["music"];

// Music is configured on the bot, connected, and enabled on this server.
export async function checkMusicAvailable(guildId: string): Promise<{ error: string } | { settings: MusicSettings }> {
    if (!music) return { error: "Music isn't set up on this bot (no NodeLink server configured)." };
    if (![...music.nodeManager.nodes.values()].some((n) => n.connected)) return { error: "The music server is offline right now. Try again in a minute." };

    const { settings } = await DBManager.getGuildConfig(guildId);
    if (!settings.music.enabled) return { error: "Music is turned off on this server." };
    return { settings: settings.music };
}

// The member is in a voice channel, and in the bot's channel if the bot is already playing.
export function checkVoice(member: GuildMember, player: Player | undefined): { error: string } | { channel: VoiceBasedChannel } {
    const channel = member.voice.channel;
    if (!channel) return { error: "Join a voice channel first." };
    if (player?.voiceChannelId && player.voiceChannelId !== channel.id) return { error: `I'm already playing in <#${player.voiceChannelId}>. Join that channel.` };
    return { channel };
}

// Whether a member may control playback (skip, stop, volume...) for everyone.
// Allowed: Manage Server, a DJ role, nobody set DJ roles, alone with the bot, or (for skip) they queued the song.
export function isDj(member: GuildMember, settings: MusicSettings, player?: Player) {
    if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
    if (!settings.djRoleIds.length) return true;
    if (settings.djRoleIds.some((id) => member.roles.cache.has(id))) return true;

    // Alone with the bot: nobody else to disrupt.
    const channel = member.voice.channel;
    if (player && channel?.id === player.voiceChannelId && channel.members.filter((m) => !m.user.bot).size === 1) return true;
    return false;
}

export function checkDj(member: GuildMember, settings: MusicSettings, player?: Player, allowRequester = false) {
    if (isDj(member, settings, player)) return null;
    if (allowRequester && requesterOf(player?.queue.current)?.id === member.id) return null;
    return `You need a DJ role (${settings.djRoleIds.map((id) => `<@&${id}>`).join(", ")}) to do that.`;
}

// There's an active player with something loaded.
export function getActivePlayer(guildId: string) {
    const player = music?.getPlayer(guildId);
    if (!player || (!player.queue.current && !player.queue.tracks.length)) return null;
    return player;
}
