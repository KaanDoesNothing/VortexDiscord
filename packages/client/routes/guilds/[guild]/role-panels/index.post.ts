import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { readBody, requireGuildManager } from "../../../../lib/api/auth";
import { parseRolePanel } from "../../../../lib/api/rolePanelInput";
import { Dashboard, Engagement } from "../../../../lib/database";
import { publishRolePanel } from "../../../../lib/engagement";

// POST /guilds/:guild/role-panels: creates a role panel and posts it.
export class RolePanelCreateRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        const body = await readBody(req, res);
        if (!body) return;

        const { input, errors } = parseRolePanel(body, access.guild);
        if (!input) return res.status(HttpCodes.BadRequest).json({ error: errors.join(". "), errors });

        if ((await Engagement.listRolePanels(access.guild.id)).length >= 25) {
            return res.status(HttpCodes.BadRequest).json({ error: "A server can have at most 25 role panels" });
        }

        const panel = await Engagement.saveRolePanel(access.guild.id, input);
        const messageId = await publishRolePanel(access.guild, panel!).catch((e: Error) => e);
        if (messageId instanceof Error) return res.status(HttpCodes.BadRequest).json({ error: messageId.message });

        await Dashboard.addAudit(access.guild.id, access.auth.id, "rolePanel.create", { title: input.title });
        return res.status(HttpCodes.Created).json({ ...panel, messageId });
    }
}
