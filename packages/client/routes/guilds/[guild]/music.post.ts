import { HttpCodes, Route } from "@sapphire/plugin-api";
import type { RepeatMode } from "lavalink-client";
import { ApiRoute } from "../../../lib/api/ApiRoute";
import { readBody, requireGuildManager } from "../../../lib/api/auth";
import * as Music from "../../../lib/music/actions";
import { getActivePlayer } from "../../../lib/music/guards";

// POST /guilds/:guild/music with { action, ... }: control the live player from the dashboard.
// Dashboard users already have Manage Server, so they count as DJs.
//   pause | resume | skip | previous | stop | shuffle
//   loop { mode: off|track|queue }   volume { volume }   seek { positionMs }
//   remove { index }   move { from, to }   clear   autoplay { on }
export class GuildMusicControlRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        const body = await readBody(req, res);
        if (!body) return;

        const player = getActivePlayer(access.guild.id);
        if (!player) return res.status(HttpCodes.Conflict).json({ error: "Nothing is playing" });

        const num = (key: string) => (typeof body[key] === "number" && Number.isFinite(body[key]) ? body[key] as number : NaN);
        let message: string | null = null;

        switch (body.action) {
            case "pause": if (!player.paused) message = await Music.togglePause(player); break;
            case "resume": if (player.paused) message = await Music.togglePause(player); break;
            case "skip": message = await Music.skip(player); break;
            case "previous": message = await Music.previous(player); break;
            case "stop": message = await Music.stop(player); break;
            case "shuffle": message = await Music.shuffle(player); break;
            case "clear": await player.queue.splice(0, player.queue.tracks.length); message = "Queue cleared."; break;
            case "loop": {
                const mode = body.mode as RepeatMode;
                if (!["off", "track", "queue"].includes(mode)) return res.status(HttpCodes.BadRequest).json({ error: "mode must be off, track or queue" });
                message = await Music.setLoop(player, mode);
                break;
            }
            case "volume": {
                if (Number.isNaN(num("volume"))) return res.status(HttpCodes.BadRequest).json({ error: "volume must be a number" });
                message = await Music.setVolume(player, num("volume"));
                break;
            }
            case "seek": {
                if (Number.isNaN(num("positionMs"))) return res.status(HttpCodes.BadRequest).json({ error: "positionMs must be a number" });
                message = await Music.seek(player, num("positionMs")) ?? "Seeked.";
                break;
            }
            case "remove": {
                const removed = await Music.removeAt(player, num("index"));
                if (!removed) return res.status(HttpCodes.BadRequest).json({ error: "No song at that position" });
                message = `Removed ${removed.info.title}.`;
                break;
            }
            case "move": {
                const moved = await Music.move(player, num("from"), num("to"));
                if (!moved) return res.status(HttpCodes.BadRequest).json({ error: "Invalid positions" });
                message = `Moved ${moved.info.title}.`;
                break;
            }
            case "autoplay": player.set("autoplay", Boolean(body.on)); message = `Autoplay ${body.on ? "on" : "off"}.`; break;
            default: return res.status(HttpCodes.BadRequest).json({ error: "Unknown action" });
        }

        return res.json({ ok: true, message });
    }
}
