import { HttpCodes, Route } from "@sapphire/plugin-api";
import { ApiRoute } from "../../../lib/api/ApiRoute";
import { readBody, requireGuildManager } from "../../../lib/api/auth";
import { parseMessage } from "../../../lib/api/messageInput";
import { Dashboard } from "../../../lib/database";
import { VortexEmbed } from "../../../lib/structures/embed";

// POST /guilds/:guild/messages: sends a message composed in the dashboard's embed builder.
export class SendMessageRoute extends ApiRoute {
    public async run(req: Route.Request, res: Route.Response) {
        const access = await requireGuildManager(req, res);
        if (!access) return;
        const body = await readBody(req, res);
        if (!body) return;

        const { input, errors } = parseMessage(body, access.guild);
        if (!input) return res.status(HttpCodes.BadRequest).json({ error: errors.join(". "), errors });

        const channel = access.guild.channels.cache.get(input.channelId)!;
        if (!channel.isSendable()) return res.status(HttpCodes.BadRequest).json({ error: "The bot can't post there" });

        const embeds = input.embed ? [new VortexEmbed()
            .setTitle(input.embed.title || null)
            .setDescription(input.embed.description || null)
            .setColor(parseInt(input.embed.color.slice(1), 16))
            .setImage(input.embed.image ?? null)
            .setFooter(input.embed.footer ? { text: input.embed.footer } : null)] : [];

        // Admins may intentionally ping roles or @everyone in announcements.
        const message = await channel.send({ content: input.content || undefined, embeds, allowedMentions: { parse: ["users", "roles", "everyone"] } });

        await Dashboard.addAudit(access.guild.id, access.auth.id, "message.send", { channelId: input.channelId });
        return res.status(HttpCodes.Created).json({ messageId: message.id, url: message.url });
    }
}
