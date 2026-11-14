import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../lib/api/auth";
import { getPage, resolveUsers } from "../../../lib/api/http";
import { Dashboard } from "../../../lib/database";

// GET /guilds/:guild/audit?page=: who changed which settings, and when.
export class GuildAuditRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;

        const page = getPage(req);
        const { rows, total } = await Dashboard.listAudit(access.guild.id, page);
        const users = await resolveUsers(rows.map((r) => r.userId));

        return res.json({ ...page, total, users, rows: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) });
    }
}
