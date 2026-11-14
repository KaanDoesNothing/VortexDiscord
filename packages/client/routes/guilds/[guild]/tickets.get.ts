import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../lib/api/auth";
import { resolveUsers } from "../../../lib/api/http";
import { Utility } from "../../../lib/database";

// GET /guilds/:guild/tickets: recent tickets (open and closed).
export class TicketListRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;

        const rows = await Utility.listTickets(access.guild.id);
        const users = await resolveUsers(rows.flatMap((t) => [t.ownerId, t.closedBy]));
        return res.json({
            users,
            rows: rows.map((t) => ({ ...t, createdAt: t.createdAt.toISOString(), closedAt: t.closedAt?.toISOString() ?? null }))
        });
    }
}
