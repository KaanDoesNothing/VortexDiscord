import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { Dashboard, Engagement } from "../../../../lib/database";

// DELETE /guilds/:guild/role-panels/:id: deletes the panel and its posted message.
export class RolePanelDeleteRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;

        const panel = await Engagement.deleteRolePanel(access.guild.id, Number(req.params.id));
        if (!panel) return res.status(HttpCodes.NotFound).json({ error: "Panel not found" });

        const channel = access.guild.channels.cache.get(panel.channelId);
        if (panel.messageId && channel?.isTextBased()) await channel.messages.delete(panel.messageId).catch(() => null);

        await Dashboard.addAudit(access.guild.id, access.auth.id, "rolePanel.delete", { title: panel.title });
        return res.status(HttpCodes.NoContent).end();
    }
}
