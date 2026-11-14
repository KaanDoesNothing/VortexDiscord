import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { CustomCommands, Dashboard } from "../../../../lib/database";

// DELETE /guilds/:guild/custom-commands/:id
export class CustomCommandDeleteRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;

        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(HttpCodes.BadRequest).json({ error: "Invalid command ID" });

        const deleted = await CustomCommands.remove(access.guild.id, id);
        if (!deleted) return res.status(HttpCodes.NotFound).json({ error: "Command not found" });

        await Dashboard.addAudit(access.guild.id, access.auth.id, "customCommand.delete", { id });
        return res.status(HttpCodes.NoContent).end();
    }
}
