import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../lib/api/auth";
import { Dashboard } from "../../../lib/database";

// GET /guilds/:guild/growth?days=30: joins and leaves per day (needs the Server Members intent to record).
export class GuildGrowthRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;

        const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
        return res.json({ days: await Dashboard.getGrowth(access.guild.id, days), tracking: Bun.env.DISCORD_MEMBERS_INTENT === "true" });
    }
}
