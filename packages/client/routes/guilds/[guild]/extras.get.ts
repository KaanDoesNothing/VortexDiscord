import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../lib/api/auth";
import { listReactionRoles } from "../../../lib/reactionRoles";
import { listStickies } from "../../../lib/sticky";
import { STAT_PLACEHOLDERS } from "../../../lib/statsChannels";

// GET /guilds/:guild/extras: sticky messages and reaction roles (both set up with commands),
// plus the placeholders stats channels can use.
export class GuildExtrasRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        const [stickies, reactionRoles] = await Promise.all([listStickies(access.guild.id), listReactionRoles(access.guild.id)]);
        return res.json({ stickies, reactionRoles, statPlaceholders: STAT_PLACEHOLDERS });
    }
}
