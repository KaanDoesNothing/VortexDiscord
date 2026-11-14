import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { readBody, requireGuildManager } from "../../../../lib/api/auth";
import { parseRolePanel } from "../../../../lib/api/rolePanelInput";
import { Dashboard, Engagement } from "../../../../lib/database";
import { publishRolePanel } from "../../../../lib/engagement";

// PATCH /guilds/:guild/role-panels/:id: saves changes and updates the posted message.
// If the channel changed, the old message is deleted and a new one is posted.
export class RolePanelUpdateRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        const body = await readBody(req, res);
        if (!body) return;

        const existing = await Engagement.getRolePanel(Number(req.params.id));
        if (!existing || existing.guildId !== access.guild.id) return res.status(HttpCodes.NotFound).json({ error: "Panel not found" });

        const { input, errors } = parseRolePanel(body, access.guild);
        if (!input) return res.status(HttpCodes.BadRequest).json({ error: errors.join(". "), errors });

        if (input.channelId !== existing.channelId && existing.messageId) {
            const old = access.guild.channels.cache.get(existing.channelId);
            if (old?.isTextBased()) await old.messages.delete(existing.messageId).catch(() => null);
            await Engagement.setRolePanelMessage(existing.id, null);
        }

        const panel = await Engagement.saveRolePanel(access.guild.id, input, existing.id);
        const messageId = await publishRolePanel(access.guild, { ...panel!, messageId: input.channelId === existing.channelId ? existing.messageId : null }).catch((e: Error) => e);
        if (messageId instanceof Error) return res.status(HttpCodes.BadRequest).json({ error: messageId.message });

        await Dashboard.addAudit(access.guild.id, access.auth.id, "rolePanel.update", { id: existing.id, title: input.title });
        return res.json({ ...panel, messageId });
    }
}
