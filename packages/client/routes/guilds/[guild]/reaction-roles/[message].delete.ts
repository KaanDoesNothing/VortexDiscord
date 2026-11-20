import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { Dashboard } from "../../../../lib/database";
import { removeReactionRole } from "../../../../lib/reactionRoles";

// DELETE /guilds/:guild/reaction-roles/:message?emoji=<emoji or emoji ID>
export class ReactionRoleDeleteRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        const emoji = typeof req.query.emoji === "string" ? req.query.emoji : "";
        if (!await removeReactionRole(access.guild.id, String(req.params.message), emoji)) return res.status(HttpCodes.NotFound).json({ error: "Reaction role not found" });
        await Dashboard.addAudit(access.guild.id, access.auth.id, "reactionRole.delete", { messageId: req.params.message, emoji });
        return res.json({ ok: true });
    }
}
