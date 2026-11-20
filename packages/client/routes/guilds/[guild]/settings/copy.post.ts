import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../../lib/api/auth";
import { canManageFromOAuth, fetchUserGuilds } from "../../../../lib/api/auth";
import { DBManager, Dashboard } from "../../../../lib/database";
import { dropForeignIds } from "../../../../lib/settings";

// POST /guilds/:guild/settings/copy with { from: <guild ID> }: copies another server's settings here.
// You must manage both servers. Channels and roles that don't exist here are cleared.
export class SettingsCopyRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        const body = (await req.readBodyJson().catch(() => null) ?? {}) as { from?: string };
        const from = String(body.from ?? "");
        if (from === access.guild.id) return res.status(HttpCodes.BadRequest).json({ error: "Pick a different server" });

        const mine = await fetchUserGuilds(access.auth);
        const source = mine.find((g) => g.id === from);
        if (!source || !canManageFromOAuth(source) || !this.container.client.guilds.cache.has(from)) {
            return res.status(HttpCodes.Forbidden).json({ error: "You need Manage Server on that server, and the bot must be in it" });
        }

        const config = await DBManager.getGuildConfig(from);
        const settings = dropForeignIds(config.settings, access.guild);
        await Dashboard.updateGuildSettings(access.guild.id, { settings, prefix: config.prefix, disabledCommands: config.disabledCommands });
        await Dashboard.addAudit(access.guild.id, access.auth.id, "settings.copy", { from });
        return res.json(await DBManager.getGuildConfig(access.guild.id));
    }
}
