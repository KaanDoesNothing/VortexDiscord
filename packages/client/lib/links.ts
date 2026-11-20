import { ActionRowBuilder, ButtonBuilder, ButtonStyle, OAuth2Scopes, PermissionFlagsBits, type Client } from "discord.js";

// Links to the bot's invite, dashboard, support server and vote page, used wherever the bot
// points people somewhere (/invite, /help, /vote, the "thanks for adding me" message).
// Optional ones come from .env and are left out when not set.

// What the bot asks for when invited: enough for every feature, without Administrator.
export const INVITE_PERMISSIONS = [
    PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AddReactions, PermissionFlagsBits.UseExternalEmojis,
    PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageNicknames,
    PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ViewAuditLog, PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.ModerateMembers, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.MoveMembers,
    PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.SendMessagesInThreads
];

export const inviteUrl = (client: Client) => client.generateInvite({ scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands], permissions: INVITE_PERMISSIONS });

const site = () => Bun.env.FRONTEND_URL?.replace(/\/$/, "") ?? null;
// Discord only allows https:// links on buttons.
const https = (url: string | null | undefined) => (url?.startsWith("https://") ? url : null);

export const dashboardUrl = (guildId?: string) => https(site() && `${site()}/dashboard${guildId ? `/${guildId}` : ""}`);
export const supportUrl = () => https(Bun.env.SUPPORT_SERVER_URL);
export const voteUrl = (client: Client) => (Bun.env.TOPGG_TOKEN || Bun.env.TOPGG_WEBHOOK_SECRET ? `https://top.gg/bot/${client.user!.id}/vote` : null);

// A row of link buttons; pass which ones you want, in order.
export function linkButtons(client: Client, which: ("invite" | "dashboard" | "support" | "vote")[], guildId?: string) {
    const urls = { invite: inviteUrl(client), dashboard: dashboardUrl(guildId), support: supportUrl(), vote: voteUrl(client) };
    const labels = { invite: "Add to server", dashboard: "Dashboard", support: "Support server", vote: "Vote" };
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const key of which) {
        const url = urls[key];
        if (url) row.addComponents(new ButtonBuilder().setLabel(labels[key]).setStyle(ButtonStyle.Link).setURL(url));
    }
    return row.components.length ? [row] : [];
}
