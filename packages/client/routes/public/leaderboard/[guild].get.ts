import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../lib/api/ApiRoute";
import { getPage, resolveUsers } from "../../../lib/api/http";
import { DBManager, Engagement } from "../../../lib/database";
import { flushXp, levelProgress } from "../../../lib/leveling";
import { inviteUrl } from "../../../lib/links";

// GET /public/leaderboard/:guild?page=: a server's XP leaderboard for its public web page. No login
// needed, but only for servers that turned it on (Dashboard → Leveling → Public leaderboard).
export class PublicLeaderboardRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const guild = this.container.client.guilds.cache.get(req.params.guild ?? "");
        const config = guild ? await DBManager.getGuildConfig(guild.id) : null;
        if (!guild || !config?.settings.leveling.enabled || !config.settings.leveling.publicLeaderboard) {
            return res.status(HttpCodes.NotFound).json({ error: "This server doesn't have a public leaderboard" });
        }

        const page = getPage(req, 50);
        await flushXp();
        const rows = await Engagement.topByXp(guild.id, page.limit, (page.page - 1) * page.limit);
        const users = await resolveUsers(rows.map((r) => r.userId));
        const difficulty = config.settings.leveling.difficulty;

        return res.json({
            guild: { id: guild.id, name: guild.name, icon: guild.iconURL({ size: 256, extension: "webp" }), memberCount: guild.memberCount },
            accent: config.settings.leveling.card.accentColor,
            // "Add this bot to your server" on the page.
            invite: inviteUrl(this.container.client),
            ...page,
            rows: rows.map((r, i) => {
                const { level, current, needed } = levelProgress(r.xp, difficulty);
                return { rank: (page.page - 1) * page.limit + i + 1, user: users[r.userId] ?? { id: r.userId, username: "Unknown", avatar: null }, level, xp: r.xp, current, needed, messages: r.messages };
            })
        });
    }
}
