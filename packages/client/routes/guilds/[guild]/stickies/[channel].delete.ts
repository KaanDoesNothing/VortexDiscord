import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { Dashboard } from "../../../../lib/database";
import { removeSticky } from "../../../../lib/sticky";

// DELETE /guilds/:guild/stickies/:channel
export class StickyDeleteRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        const channelId = String(req.params.channel);
        if (!access.guild.channels.cache.has(channelId)) return res.status(HttpCodes.NotFound).json({ error: "Channel not found" });
        const removed = await removeSticky(channelId);
        if (!removed) return res.status(HttpCodes.NotFound).json({ error: "No sticky message there" });
        const channel = access.guild.channels.cache.get(channelId);
        if (removed.lastMessageId && channel?.isTextBased()) await channel.messages.delete(removed.lastMessageId).catch(() => null);
        await Dashboard.addAudit(access.guild.id, access.auth.id, "sticky.delete", { channelId });
        return res.json({ ok: true });
    }
}
