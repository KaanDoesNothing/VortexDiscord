import { container } from "@sapphire/framework";
import { LavalinkManager, NodeType, type Player, type Track } from "lavalink-client";
import { DBManager } from "../database";
import { nowPlayingMessage } from "./ui";

// The music engine: one LavalinkManager talking to a NodeLink (or Lavalink v4) server.
//
// Configure in .env:  NODELINK_HOST, NODELINK_PORT, NODELINK_PASSWORD, NODELINK_SECURE (true for wss/https).
// Without NODELINK_HOST, music is simply turned off and music commands say so.

const host = Bun.env.NODELINK_HOST;

// Autoplay (toggled per player with /autoplay): when the queue runs out, queue a related song.
// YouTube tracks use YouTube's "Mix" playlist for that video; others search for the same artist.
// Recently played songs are skipped so it doesn't loop.
async function autoplay(player: Player, lastTrack: Track) {
    if (!player.get<boolean>("autoplay") || !lastTrack) return;

    const query = lastTrack.info.sourceName === "youtube"
        ? `https://www.youtube.com/watch?v=${lastTrack.info.identifier}&list=RD${lastTrack.info.identifier}`
        : { query: `${lastTrack.info.author} ${lastTrack.info.title}`, source: "ytsearch" as const };

    const result = await player.search(query, lastTrack.requester).catch(() => null);
    const recent = new Set([lastTrack.info.identifier, ...player.queue.previous.map((t) => t.info.identifier)]);
    const next = result?.tracks.find((t) => t.info.identifier && !recent.has(t.info.identifier) && !t.info.isStream);
    if (next) await player.queue.add(next);
}

export const musicConfigured = Boolean(host);

// Builds the manager. Returns null (music off) if the settings are invalid, instead of crashing every
// command that imports this file.
function createManager() {
    if (!musicConfigured) return null;
    try {
        return new LavalinkManager({
            nodes: [{
                id: "main",
                host: host!,
                port: Number(Bun.env.NODELINK_PORT ?? 3000),
                // NodeLink's default password, used if none is set.
                authorization: Bun.env.NODELINK_PASSWORD || "youshallnotpass",
                secure: Bun.env.NODELINK_SECURE === "true",
                // Tell the library it's NodeLink, which unlocks lyrics and skips Lavalink plugin checks.
                nodeType: Bun.env.NODELINK_TYPE === "lavalink" ? NodeType.Lavalink : NodeType.NodeLink,
                retryAmount: Infinity,
                retryDelay: 10_000,
                // On connection errors, reconnect directly. With closeOnError the library closes the socket
                // with code 500, which Bun's WebSocket rejects (it's not a valid close code) and throws.
                closeOnError: false,
                // Same issue in the Lavalink-only heartbeat (it also closes with 500). NodeLink doesn't use it.
                heartBeatInterval: 0
            }],
            // Voice packets go out through the shard that owns the guild.
            sendToShard: (guildId, payload) => container.client.guilds.cache.get(guildId)?.shard.send(payload),
            autoSkip: true,
            playerOptions: {
                defaultSearchPlatform: "ytsearch",
                // Volume is applied by the node (sounds better than a filter-based volume).
                applyVolumeAsFilter: false,
                // Store a small, serialisable requester instead of the whole discord.js User.
                requesterTransformer: (user) => {
                    const u = user as { id: string; username: string; displayAvatarURL?: () => string };
                    return { id: u.id, username: u.username, avatar: u.displayAvatarURL?.() ?? "" };
                },
                onDisconnect: { autoReconnect: true, destroyPlayer: false },
                // Leaving after the queue ends is handled per server below (settings.music.leaveAfterQueueEndSeconds).
                onEmptyQueue: { destroyAfterMs: -1, autoPlayFunction: autoplay }
            },
            queueOptions: { maxPreviousTracks: 25 }
        });
    } catch (error) {
        console.error("Music is disabled: invalid NodeLink settings.", error);
        return null;
    }
}

export const music = createManager();

// Messages we posted for the current song, so we can remove the old card when the next one starts.
const nowPlayingMessages = new Map<string, { channelId: string; messageId: string }>();
// Pending "leave because the queue ended" timers.
const idleTimers = new Map<string, Timer>();

export function clearIdleTimer(guildId: string) {
    const timer = idleTimers.get(guildId);
    if (timer) clearTimeout(timer);
    idleTimers.delete(guildId);
}

// Deletes the previous now-playing card (keeps channels tidy).
async function removeNowPlaying(guildId: string) {
    const previous = nowPlayingMessages.get(guildId);
    nowPlayingMessages.delete(guildId);
    if (!previous) return;
    const channel = container.client.channels.cache.get(previous.channelId);
    if (channel?.isTextBased()) await channel.messages.delete(previous.messageId).catch(() => null);
}

// Sends a message to the player's text channel, ignoring failures.
export async function notify(player: Player, content: string) {
    const channel = player.textChannelId ? container.client.channels.cache.get(player.textChannelId) : null;
    if (channel?.isSendable()) await channel.send({ content, allowedMentions: { parse: [] } }).catch(() => null);
}

if (music) {
    // Node connection status, for logs.
    music.nodeManager
        .on("connect", (node) => container.logger.info(`Music node "${node.id}" connected (${node.nodeType}).`))
        .on("disconnect", (node, reason) => container.logger.warn(`Music node "${node.id}" disconnected: ${reason?.reason ?? "unknown"}`))
        .on("error", (node, error) => container.logger.error(`Music node "${node.id}" error:`, error));

    music.on("trackStart", async (player, track) => {
        clearIdleTimer(player.guildId);
        if (!track) return;

        const { settings } = await DBManager.getGuildConfig(player.guildId);
        await removeNowPlaying(player.guildId);
        if (!settings.music.announceNowPlaying) return;

        const channel = player.textChannelId ? container.client.channels.cache.get(player.textChannelId) : null;
        if (!channel?.isSendable()) return;

        const message = await channel.send(nowPlayingMessage(player, track as Track)).catch(() => null);
        if (message) nowPlayingMessages.set(player.guildId, { channelId: channel.id, messageId: message.id });
    });

    music.on("trackError", async (player, track, payload) => {
        container.logger.warn(`Track error in ${player.guildId}: ${payload.exception?.message ?? "unknown"}`);
        await notify(player, `⚠️ Couldn't play **${track?.info.title ?? "that track"}**${payload.exception?.message ? `: ${payload.exception.message}` : ""}. Skipping.`);
    });

    music.on("trackStuck", async (player, track) => {
        await notify(player, `⚠️ **${track?.info.title ?? "The track"}** got stuck. Skipping.`);
    });

    // Queue finished: say so, then leave after the server's timeout (unless 24/7 is on).
    music.on("queueEnd", async (player) => {
        await removeNowPlaying(player.guildId);
        const { settings } = await DBManager.getGuildConfig(player.guildId);
        if (settings.music.stay247 || player.get("autoplay")) return;

        const seconds = settings.music.leaveAfterQueueEndSeconds;
        if (seconds === 0) {
            await player.destroy("queueEnd");
            return;
        }

        await notify(player, `✅ The queue has finished. I'll leave in ${seconds >= 60 ? `${Math.round(seconds / 60)} minute(s)` : `${seconds} seconds`} unless something is added.`);
        clearIdleTimer(player.guildId);
        idleTimers.set(player.guildId, setTimeout(async () => {
            idleTimers.delete(player.guildId);
            const current = music.getPlayer(player.guildId);
            if (current && !current.playing && !current.queue.current) await current.destroy("idle");
        }, seconds * 1000));
    });

    music.on("playerDestroy", async (player) => {
        clearIdleTimer(player.guildId);
        await removeNowPlaying(player.guildId);
    });

    // Someone dragged the bot out of voice or deleted the channel.
    music.on("playerDisconnect", async (player) => {
        await player.destroy("disconnected").catch(() => null);
    });
}

// Connects to the node once the bot knows its own user ID (called from the ready listener).
export async function initMusic() {
    if (!music) return;
    const user = container.client.user!;
    await music.init({ id: user.id, username: user.username });
}

// Health of the music node(s), for stats pages.
export function musicNodeStatus() {
    if (!music) return { configured: false, nodes: [], players: 0, playing: 0 };
    const nodes = [...music.nodeManager.nodes.values()].map((n) => ({
        id: n.id,
        type: n.nodeType,
        connected: n.connected,
        players: n.stats?.players ?? 0,
        playingPlayers: n.stats?.playingPlayers ?? 0,
        uptimeMs: n.stats?.uptime ?? 0,
        memoryMb: Math.round((n.stats?.memory?.used ?? 0) / 1024 / 1024),
        cpuLoad: n.stats?.cpu?.lavalinkLoad ?? 0
    }));
    const players = [...music.players.values()];
    return { configured: true, nodes, players: players.length, playing: players.filter((p) => p.playing).length };
}
