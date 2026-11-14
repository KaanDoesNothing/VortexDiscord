import type { Guild } from "discord.js";

// A message composed in the dashboard (embed builder / scheduled announcements).
export interface MessageInput {
    channelId: string;
    content: string;
    embed: { title: string; description: string; color: string; image?: string; footer?: string } | null;
}

const HEX = /^#[0-9a-f]{6}$/i;
const URL_RE = /^https:\/\/\S+$/;

// Validates a message body: a channel the bot can post in, plus text and/or an embed.
export function parseMessage(body: Record<string, unknown>, guild: Guild): { input?: MessageInput; errors: string[] } {
    const errors: string[] = [];

    const channelId = String(body.channelId ?? "");
    if (!guild.channels.cache.get(channelId)?.isSendable()) errors.push("Pick a channel the bot can post in");

    const content = typeof body.content === "string" ? body.content : "";
    if (content.length > 2000) errors.push("Message text can be at most 2000 characters");

    let embed: MessageInput["embed"] = null;
    const e = body.embed as Record<string, unknown> | null | undefined;
    if (e && typeof e === "object") {
        const title = typeof e.title === "string" ? e.title : "";
        const description = typeof e.description === "string" ? e.description : "";
        const color = typeof e.color === "string" && HEX.test(e.color) ? e.color : "#6d6af0";
        const image = typeof e.image === "string" && URL_RE.test(e.image) ? e.image : undefined;
        const footer = typeof e.footer === "string" ? e.footer : undefined;

        if (title.length > 256) errors.push("Embed title can be at most 256 characters");
        if (description.length > 4000) errors.push("Embed description can be at most 4000 characters");
        if ((footer?.length ?? 0) > 2048) errors.push("Embed footer can be at most 2048 characters");
        if (title || description || image) embed = { title, description, color, image, footer };
    }

    if (!content.trim() && !embed) errors.push("Write a message or fill in the embed");
    return errors.length ? { errors } : { input: { channelId, content, embed }, errors };
}
