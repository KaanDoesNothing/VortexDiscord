import { Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../lib/api/ApiRoute";
import { requireGuildManager } from "../../../lib/api/auth";
import { getPage, resolveUsers } from "../../../lib/api/http";
import { DBManager, Dashboard } from "../../../lib/database";
import { levelFromXp } from "../../../lib/leveling";

/** GET /guilds/:guild/leaderboard?page= */
export class GuildLeaderboardRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;

        const page = getPage(req);
        const [{ rows, total }, { settings }] = await Promise.all([Dashboard.getLeaderboard(access.guild.id, page), DBManager.getGuildConfig(access.guild.id)]);
        const users = await resolveUsers(rows.map((row) => row.userId));
        const start = (page.page - 1) * page.limit;

        return res.json({
            ...page,
            total,
            users,
            rows: rows.map((row, i) => ({
                rank: start + i + 1,
                userId: row.userId,
                level: levelFromXp(row.xp, settings.leveling.difficulty),
                xp: row.xp,
                messages: row.messages,
                voiceMinutes: row.voiceMinutes
            }))
        });
    }
}
