import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { getQuery, resolveUsers } from "../../../../lib/api/http";
import { Utility } from "../../../../lib/database";

// GET /guilds/:guild/suggestions?status=open
export class SuggestionListRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;

        const rows = await Utility.listSuggestions(access.guild.id, getQuery(req, "status"));
        const users = await resolveUsers(rows.map((s) => s.authorId));
        return res.json({ users, rows: rows.map((s) => ({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() })) });
    }
}
