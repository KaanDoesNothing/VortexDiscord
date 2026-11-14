import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { Dashboard } from "../../../../lib/database";
import { cancelTask } from "../../../../lib/scheduler";

// DELETE /guilds/:guild/announcements/:id
export class AnnouncementDeleteRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;

        const removed = await cancelTask(Number(req.params.id), access.guild.id);
        if (!removed) return res.status(HttpCodes.NotFound).json({ error: "Announcement not found" });

        await Dashboard.addAudit(access.guild.id, access.auth.id, "announcement.delete", { id: Number(req.params.id) });
        return res.status(HttpCodes.NoContent).end();
    }
}
