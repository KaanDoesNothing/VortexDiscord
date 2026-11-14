import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../lib/api/ApiRoute";
import { requireOwner } from "../../../lib/api/auth";
import { DBManager, Engagement } from "../../../lib/database";
import { isBlacklisted } from "../../../lib/owner";

// GET /owner/users/:id: a user's Discord profile plus their bot data (economy, birthday, mutual servers).
export class OwnerUserRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        if (!requireOwner(req, res)) return;

        const id = req.params.id ?? "";
        if (!/^\d{15,25}$/.test(id)) return res.status(HttpCodes.BadRequest).json({ error: "That isn't a user ID" });

        const user = await this.container.client.users.fetch(id).catch(() => null);
        if (!user) return res.status(HttpCodes.NotFound).json({ error: "No Discord user with that ID" });

        const [data, birthday] = await Promise.all([DBManager.getUser(id), Engagement.getBirthday(id)]);
        const mutual = this.container.client.guilds.cache.filter((g) => g.members.cache.has(id)).map((g) => ({ id: g.id, name: g.name }));

        return res.json({
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.displayAvatarURL({ size: 128, extension: "webp" }),
            bot: user.bot,
            createdAt: user.createdAt.toISOString(),
            blacklisted: isBlacklisted(id),
            data: { balance: data.balance, bank: data.bank, bio: data.bio, likes: data.likes, dislikes: data.dislikes, dailyStreak: data.dailyStreak },
            birthday,
            mutualServers: mutual.slice(0, 25)
        });
    }
}
