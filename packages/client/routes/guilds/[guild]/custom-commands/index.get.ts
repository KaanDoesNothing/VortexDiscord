import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { CustomCommands } from "../../../../lib/database";

// GET /guilds/:guild/custom-commands
export class CustomCommandListRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;

        return res.json(await CustomCommands.list(access.guild.id));
    }
}
