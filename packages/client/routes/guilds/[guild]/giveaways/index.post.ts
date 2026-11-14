import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { readBody, requireGuildManager } from "../../../../lib/api/auth";
import { Dashboard } from "../../../../lib/database";
import { startGiveaway } from "../../../../lib/engagement";

// POST /guilds/:guild/giveaways with { channelId, prize, winnerCount, durationMinutes }
export class GiveawayCreateRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        const body = await readBody(req, res);
        if (!body) return;

        const prize = typeof body.prize === "string" ? body.prize.trim() : "";
        const winnerCount = Number(body.winnerCount);
        const durationMinutes = Number(body.durationMinutes);

        if (!prize || prize.length > 200) return res.status(HttpCodes.BadRequest).json({ error: "Prize must be 1-200 characters" });
        if (!Number.isInteger(winnerCount) || winnerCount < 1 || winnerCount > 20) return res.status(HttpCodes.BadRequest).json({ error: "Winners must be 1-20" });
        if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 60 * 24 * 60) return res.status(HttpCodes.BadRequest).json({ error: "Duration must be 1 minute to 60 days" });

        const g = await startGiveaway({
            guild: access.guild,
            channelId: String(body.channelId ?? ""),
            prize,
            winnerCount,
            hostId: access.auth.id,
            durationMs: durationMinutes * 60_000
        }).catch((e: Error) => e);
        if (g instanceof Error) return res.status(HttpCodes.BadRequest).json({ error: g.message });

        await Dashboard.addAudit(access.guild.id, access.auth.id, "giveaway.start", { prize });
        return res.status(HttpCodes.Created).json({ id: g.id });
    }
}
