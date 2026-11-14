import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../lib/api/ApiRoute";
import { requireOwner } from "../../../lib/api/auth";

// DELETE /owner/guilds/:id: makes the bot leave a server.
export class OwnerLeaveGuildRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        if (!requireOwner(req, res)) return;

        const guild = this.container.client.guilds.cache.get(req.params.id ?? "");
        if (!guild) return res.status(HttpCodes.NotFound).json({ error: "The bot isn't in that server" });

        await guild.leave();
        this.container.logger.info(`Left ${guild.name} (${guild.id}) from the owner panel.`);
        return res.status(HttpCodes.NoContent).end();
    }
}
