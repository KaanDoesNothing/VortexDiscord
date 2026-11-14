import { Events, Listener } from "@sapphire/framework";
import type { VoiceState } from "discord.js";
import { DBManager } from "../lib/database";
import { music, notify } from "../lib/music/manager";

// Glue between Discord and the music engine (lib/music/manager.ts).

// Raw gateway packets (voice state/server updates, channel deletes) must be forwarded so the
// music node can join voice and notice when its channel disappears.
export class MusicRawListener extends Listener<typeof Events.Raw> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "MusicRaw", event: Events.Raw, enabled: Boolean(music) });
    }

    public async run(packet: Parameters<NonNullable<typeof music>["sendRawData"]>[0]) {
        await music!.sendRawData(packet);
    }
}

// Leave when everyone else has left the voice channel (after the server's grace period), unless 24/7 is on.
const aloneTimers = new Map<string, Timer>();

export class MusicVoiceListener extends Listener<typeof Events.VoiceStateUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "MusicAloneCheck", event: Events.VoiceStateUpdate, enabled: Boolean(music) });
    }

    public async run(before: VoiceState, after: VoiceState) {
        const player = music?.getPlayer(after.guild.id);
        if (!player?.voiceChannelId) return;

        // Only joins/leaves of the bot's channel matter.
        if (before.channelId !== player.voiceChannelId && after.channelId !== player.voiceChannelId) return;

        const channel = after.guild.channels.cache.get(player.voiceChannelId);
        const listeners = channel?.isVoiceBased() ? channel.members.filter((m) => !m.user.bot).size : 0;
        const key = after.guild.id;

        if (listeners > 0) {
            // Someone's back: cancel the pending leave and resume if we paused for being alone.
            const timer = aloneTimers.get(key);
            if (timer) clearTimeout(timer);
            aloneTimers.delete(key);
            if (player.get("pausedAlone")) {
                player.set("pausedAlone", false);
                await player.resume().catch(() => null);
            }
            return;
        }

        const { settings } = await DBManager.getGuildConfig(key);
        if (settings.music.stay247 || aloneTimers.has(key)) return;

        // Pause right away so nobody misses anything, then leave after the grace period.
        if (player.playing && !player.paused) {
            player.set("pausedAlone", true);
            await player.pause().catch(() => null);
        }

        aloneTimers.set(key, setTimeout(async () => {
            aloneTimers.delete(key);
            const current = music?.getPlayer(key);
            if (!current) return;
            await notify(current, "👋 Everyone left the voice channel, so I left too.");
            await current.destroy("alone").catch(() => null);
        }, settings.music.leaveWhenAloneSeconds * 1000));
    }
}
