import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../../lib/api/ApiRoute";
import { readBody, requireGuildManager } from "../../../../lib/api/auth";
import { Dashboard, Utility } from "../../../../lib/database";
import { renderSuggestion } from "../../../../lib/utility";

const STATUSES = ["open", "approved", "denied", "implemented"];

// PATCH /guilds/:guild/suggestions/:id with { status, response? }: same as /review in Discord.
export class SuggestionUpdateRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        const body = await readBody(req, res);
        if (!body) return;

        const status = String(body.status ?? "");
        if (!STATUSES.includes(status)) return res.status(HttpCodes.BadRequest).json({ error: `status must be one of ${STATUSES.join(", ")}` });
        const response = typeof body.response === "string" && body.response.trim() ? body.response.trim().slice(0, 900) : null;

        const s = await Utility.setSuggestionStatus(access.guild.id, Number(req.params.id), status, response);
        if (!s) return res.status(HttpCodes.NotFound).json({ error: "Suggestion not found" });

        // Update the posted suggestion and tell the author.
        const channel = access.guild.channels.cache.get(s.channelId);
        if (channel?.isTextBased() && s.messageId) {
            const message = await channel.messages.fetch(s.messageId).catch(() => null);
            const author = message?.embeds[0]?.author;
            await message?.edit({ embeds: [renderSuggestion(s, author ? { tag: author.name, avatar: author.iconURL ?? "" } : undefined)] }).catch(() => null);
        }
        const user = await this.container.client.users.fetch(s.authorId).catch(() => null);
        await user?.send(`Your suggestion #${s.id} in **${access.guild.name}** was marked **${status}**.${response ? `\n> ${response}` : ""}`).catch(() => null);

        await Dashboard.addAudit(access.guild.id, access.auth.id, "suggestion.review", { id: s.id, status });
        return res.json({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() });
    }
}
