import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../lib/api/auth";
import { getPage, getQuery, resolveUsers } from "../../../lib/api/http";
import { Dashboard } from "../../../lib/database";

/** GET /guilds/:guild/modlogs?page=&type=warn */
export class GuildModLogsRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;

        const page = getPage(req);
        const { rows, total } = await Dashboard.listModLogs(access.guild.id, page, getQuery(req, "type"));
        const users = await resolveUsers(rows.flatMap((row) => [row.moderatorId, row.targetId]));

        return res.json({
            ...page,
            total,
            users,
            rows: rows.map((row) => ({
                id: row.id,
                type: row.type,
                moderatorId: row.moderatorId,
                targetId: row.targetId,
                reason: row.reason,
                createdAt: row.createdAt.toISOString()
            }))
        });
    }
}
