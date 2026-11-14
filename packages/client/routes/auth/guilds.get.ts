import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../lib/api/ApiRoute";
import { CDN } from "discord.js";
import { canManageFromOAuth, fetchUserGuilds, requireAuth } from "../../lib/api/auth";

const cdn = new CDN();

/** GET /auth/guilds: servers the user can manage, and whether the bot is in each. */
export class AuthGuildsRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const auth = requireAuth(req, res);
        if (!auth) return;

        const userGuilds = await fetchUserGuilds(auth).catch(() => null);
        if (!userGuilds) return res.status(HttpCodes.BadGateway).json({ error: "Couldn't load your servers from Discord" });

        const botGuilds = this.container.client.guilds.cache;

        const guilds = userGuilds
            .filter(canManageFromOAuth)
            .map((guild) => ({
                id: guild.id,
                name: guild.name,
                icon: guild.icon ? cdn.icon(guild.id, guild.icon, { size: 128, extension: "webp" }) : null,
                botPresent: botGuilds.has(guild.id)
            }))
            .sort((a, b) => Number(b.botPresent) - Number(a.botPresent) || a.name.localeCompare(b.name));

        return res.json(guilds);
    }
}
