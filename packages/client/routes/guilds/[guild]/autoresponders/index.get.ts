import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { listAutoresponders } from "../../../../lib/autoresponders";

// GET /guilds/:guild/autoresponders
export class AutoresponderListRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        return res.json(await listAutoresponders(access.guild.id));
    }
}
