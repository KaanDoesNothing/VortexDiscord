import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../lib/api/auth";
import { requesterOf } from "../../../lib/music/format";
import { music, musicConfigured } from "../../../lib/music/manager";
import type { Track, UnresolvedTrack } from "lavalink-client";

const serialize = (t: Track | UnresolvedTrack, index?: number) => ({
    index,
    title: t.info.title,
    author: t.info.author ?? "",
    uri: t.info.uri ?? null,
    artworkUrl: t.info.artworkUrl ?? null,
    durationMs: t.info.duration ?? 0,
    isStream: Boolean(t.info.isStream),
    source: t.info.sourceName ?? "",
    requester: requesterOf(t)
});

// GET /guilds/:guild/music: the live player for the dashboard (polled every few seconds).
export class GuildMusicRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;

        const nodeOnline = Boolean(music && [...music.nodeManager.nodes.values()].some((n) => n.connected));
        const player = music?.getPlayer(access.guild.id);

        if (!player || (!player.queue.current && !player.queue.tracks.length)) {
            return res.json({ configured: musicConfigured, nodeOnline, active: false });
        }

        return res.json({
            configured: true,
            nodeOnline,
            active: true,
            voiceChannelId: player.voiceChannelId,
            voiceChannelName: access.guild.channels.cache.get(player.voiceChannelId ?? "")?.name ?? null,
            paused: player.paused,
            playing: player.playing,
            volume: player.volume,
            repeatMode: player.repeatMode,
            autoplay: Boolean(player.get("autoplay")),
            positionMs: player.position ?? 0,
            current: player.queue.current ? serialize(player.queue.current) : null,
            queue: player.queue.tracks.slice(0, 100).map((t, i) => serialize(t, i)),
            queueLength: player.queue.tracks.length,
            queueDurationMs: player.queue.utils.totalDuration(),
            previousCount: player.queue.previous.length
        });
    }
}
