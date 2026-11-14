import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { Engagement } from "../../../../lib/database";

// GET /guilds/:guild/role-panels
export class RolePanelListRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        return res.json(await Engagement.listRolePanels(access.guild.id));
    }
}
