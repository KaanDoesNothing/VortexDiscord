import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../lib/api/auth";
import { getPage, getQuery, resolveUsers } from "../../../lib/api/http";
import { Dashboard } from "../../../lib/database";

/** GET /guilds/:guild/commandlogs?page=&command=ping */
export class GuildCommandLogsRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;

        const page = getPage(req);
        const { rows, total } = await Dashboard.listCommandLogs(access.guild.id, page, getQuery(req, "command"));
        const users = await resolveUsers(rows.map((row) => row.userId));

        return res.json({
            ...page,
            total,
            users,
            rows: rows.map((row) => ({
                id: row.id,
                userId: row.userId,
                command: row.command,
                parameters: row.parameters,
                slash: row.slash,
                createdAt: row.createdAt.toISOString()
            }))
        });
    }
}
