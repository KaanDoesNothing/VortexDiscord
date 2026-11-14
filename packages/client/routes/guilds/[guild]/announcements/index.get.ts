import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { Utility } from "../../../../lib/database";

// GET /guilds/:guild/announcements: scheduled (and repeating) announcements.
export class AnnouncementListRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;

        const tasks = await Utility.listTasks(access.guild.id, ["announcement"]);
        return res.json(tasks.map((t) => ({ id: t.id, runAt: t.runAt.toISOString(), repeatMinutes: t.repeatMinutes, ...(t.payload as object) })));
    }
}
