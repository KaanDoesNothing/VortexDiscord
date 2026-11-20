import type { Guild, GuildMember, PartialGuildMember, User } from "discord.js";
import { renderTemplate, type RichMessage, type TemplateContext } from "./settings";
import { VortexEmbed } from "./structures/embed";

// Turns a message template from the dashboard (text + optional embed) into something you can send.
// Placeholders are filled in everywhere: text, embed title, description, footer and image links.

export interface RenderedMessage { content?: string; embeds: VortexEmbed[] }

export function renderMessage(message: RichMessage, ctx: TemplateContext, guildId?: string | null): RenderedMessage {
    const fill = (text: string) => renderTemplate(text, ctx);
    const content = fill(message.content).slice(0, 2000);
    const e = message.embed;
    const embeds: VortexEmbed[] = [];

    if (e.enabled && (e.title || e.description || e.image)) {
        const embed = new VortexEmbed(guildId);
        if (e.color) embed.setColor(parseInt(e.color.slice(1), 16));
        if (e.title) embed.setTitle(fill(e.title).slice(0, 256));
        if (e.description) embed.setDescription(fill(e.description).slice(0, 4096));
        if (e.footer) embed.setFooter({ text: fill(e.footer).slice(0, 2048) });
        const image = e.image && fill(e.image);
        const thumbnail = e.thumbnail && fill(e.thumbnail);
        if (image?.startsWith("https://")) embed.setImage(image);
        if (thumbnail?.startsWith("https://")) embed.setThumbnail(thumbnail);
        embeds.push(embed);
    }

    return { content: content.trim() ? content : undefined, embeds };
}

// Placeholder values for a user, and a member of a server if we have one.
export function userContext(user: User, member?: GuildMember | PartialGuildMember | null): TemplateContext["user"] {
    return {
        id: user.id,
        username: user.username,
        displayName: member?.displayName ?? user.displayName,
        avatarUrl: (member && "displayAvatarURL" in member ? member.displayAvatarURL({ size: 512 }) : null) ?? user.displayAvatarURL({ size: 512 }),
        createdAt: user.createdAt,
        joinedAt: member?.joinedAt ?? null
    };
}

export function serverContext(guild: Guild): TemplateContext["server"] {
    return {
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        iconUrl: guild.iconURL({ size: 512 }),
        boosts: guild.premiumSubscriptionCount ?? 0
    };
}

// The common case: a template about a member of a server.
export const memberContext = (member: GuildMember | PartialGuildMember, extra: Partial<TemplateContext> = {}): TemplateContext => ({
    user: userContext(member.user, member),
    server: serverContext(member.guild),
    ...extra
});
