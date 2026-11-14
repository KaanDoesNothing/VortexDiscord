import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { readBody, requireGuildManager } from "../../../../lib/api/auth";
import { Dashboard, Engagement } from "../../../../lib/database";
import { concludeGiveaway, rerollGiveaway } from "../../../../lib/engagement";

// POST /guilds/:guild/giveaways/:id with { action: "end" | "reroll" }
export class GiveawayActionRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        const body = await readBody(req, res);
        if (!body) return;

        const g = await Engagement.getGiveaway(Number(req.params.id));
        if (!g || g.guildId !== access.guild.id) return res.status(HttpCodes.NotFound).json({ error: "Giveaway not found" });

        if (body.action === "end") {
            if (g.ended) return res.status(HttpCodes.BadRequest).json({ error: "Already ended" });
            await concludeGiveaway(g.id);
        } else if (body.action === "reroll") {
            if (!g.ended) return res.status(HttpCodes.BadRequest).json({ error: "End the giveaway first" });
            await rerollGiveaway(g.id);
        } else {
            return res.status(HttpCodes.BadRequest).json({ error: "action must be end or reroll" });
        }

        await Dashboard.addAudit(access.guild.id, access.auth.id, `giveaway.${body.action}`, { prize: g.prize });
        return res.json({ ok: true });
    }
}
