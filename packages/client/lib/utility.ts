import { container } from "@sapphire/framework";
import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ModalBuilder,
    OverwriteType,
    PermissionFlagsBits,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    TextInputBuilder,
    TextInputStyle,
    time,
    type Guild,
    type GuildMember,
    type Message,
    type TextChannel
} from "discord.js";
import { DBManager, Utility } from "./database";
import { nextRun } from "./cron";
import { registerTask, schedule } from "./scheduler";
import { memberContext, renderMessage } from "./messages";
import type { GuildSettings } from "./settings";
import { brandingFor } from "./structures/context";
import { Colors, VortexEmbed } from "./structures/embed";

// Tickets, suggestions, reminders and scheduled announcements.

// ---------- Reminders ----------

// Payload: { userId, channelId, message, dm }
registerTask("reminder", async (task) => {
    const { userId, channelId, message, dm } = task.payload as { userId: string; channelId: string; message: string; dm: boolean };
    const content = `⏰ <@${userId}>, you asked me to remind you: **${message}**\n-# Set ${time(task.createdAt, "R")}`;

    if (!dm) {
        const channel = await container.client.channels.fetch(channelId).catch(() => null);
        const sent = channel?.isSendable() ? await channel.send({ content, allowedMentions: { users: [userId] } }).catch(() => null) : null;
        if (sent) return;
    }

    // DM requested, or the channel is gone / not writable.
    const user = await container.client.users.fetch(userId).catch(() => null);
    await user?.send({ content }).catch(() => null);
});

// ---------- Scheduled announcements (dashboard) ----------

// Payload: { channelId, content, embed: { title, description, color } | null, cron?, timezone? }
registerTask("announcement", async (task) => {
    const { channelId, content, embed, cron, timezone } = task.payload as { channelId: string; content?: string; embed?: { title?: string; description?: string; color?: string; image?: string; footer?: string } | null; cron?: string | null; timezone?: string | null };

    // Calendar schedules: queue the next run first, so a failed post doesn't end the schedule.
    if (cron) {
        const next = nextRun(cron, timezone ?? "UTC");
        if (next) await schedule({ type: "announcement", guildId: task.guildId, runAt: next, payload: task.payload as Record<string, unknown>, createdBy: task.createdBy });
    }

    const guild = container.client.guilds.cache.get(task.guildId ?? "");
    const channel = guild?.channels.cache.get(channelId);
    if (!channel?.isSendable()) return;

    const embeds = embed && (embed.title || embed.description || embed.image)
        ? [new VortexEmbed(task.guildId).setTitle(embed.title || null).setDescription(embed.description || null).setColor(embed.color ? parseInt(embed.color.replace("#", ""), 16) : brandingFor(task.guildId)?.color ?? Colors.brand)
            .setImage(embed.image ?? null).setFooter(embed.footer ? { text: embed.footer } : null)]
        : [];

    // Announcements may ping roles/everyone on purpose (it's an admin feature).
    await channel.send({ content: content || undefined, embeds, allowedMentions: { parse: ["roles", "everyone", "users"] } });
});

// ---------- Tickets ----------

type TicketSettings = GuildSettings["tickets"];
type TicketType = TicketSettings["types"][number];

// The panel posted by /ticket panel: a menu of ticket types, or a single button if there are none.
export function renderTicketPanel(tickets: TicketSettings, guildId: string) {
    const embed = new VortexEmbed(guildId).setTitle("🎫 Need help?")
        .setDescription(tickets.types.length ? "Pick what you need help with below to open a private ticket with the staff team." : "Click the button below to open a private ticket with the staff team.");

    if (!tickets.types.length) {
        return { embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId("ticket:open").setLabel("Open a ticket").setEmoji("🎫").setStyle(ButtonStyle.Primary)
        )] };
    }

    const menu = new StringSelectMenuBuilder().setCustomId("ticket:type").setPlaceholder("Choose a ticket type…")
        .addOptions(tickets.types.map((t, i) => {
            const option = new StringSelectMenuOptionBuilder().setLabel(t.name).setValue(String(i));
            if (t.description) option.setDescription(t.description);
            if (t.emoji) option.setEmoji(t.emoji);
            return option;
        }));
    return { embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)] };
}

// The form shown before opening a ticket type that has questions.
export function ticketForm(typeIndex: number, type: TicketType) {
    return new ModalBuilder().setCustomId(`ticket:form:${typeIndex}`).setTitle(type.name.slice(0, 45)).addComponents(
        type.questions.slice(0, 5).map((q, i) => new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId(`q${i}`).setLabel(q.slice(0, 45)).setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(true)
        ))
    );
}

const controls = (claimedBy: string | null) => new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ticket:claim").setLabel(claimedBy ? "Unclaim" : "Claim").setEmoji("🙋").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:close").setLabel("Close ticket").setEmoji("🔒").setStyle(ButtonStyle.Danger)
);

// Staff roles for a ticket: its type's own staff roles if set, else the server's.
const staffFor = (tickets: TicketSettings, typeName: string | null) => {
    const type = typeName ? tickets.types.find((t) => t.name === typeName) : undefined;
    return type?.staffRoleIds.length ? type.staffRoleIds : tickets.staffRoleIds;
};

export const isTicketStaff = (member: GuildMember, tickets: TicketSettings, typeName: string | null) =>
    staffFor(tickets, typeName).some((id) => member.roles.cache.has(id)) || member.permissions.has(PermissionFlagsBits.ManageChannels);

// Creates a private channel only the member, staff roles and the bot can see.
export async function openTicket(guild: Guild, member: GuildMember, options: { topic?: string | null; typeIndex?: number; answers?: { question: string; answer: string }[] } = {}) {
    const { tickets } = (await DBManager.getGuildConfig(guild.id)).settings;
    if (!tickets.enabled) throw new Error("Tickets aren't enabled on this server.");

    const type = options.typeIndex !== undefined ? tickets.types[options.typeIndex] : undefined;
    if (options.typeIndex !== undefined && !type) throw new Error("That ticket type doesn't exist anymore. Ask staff to re-post the panel.");

    const open = await Utility.countOpenTickets(guild.id, member.id);
    if (open >= tickets.maxOpenPerUser) throw new Error(`You already have ${open} open ticket${open === 1 ? "" : "s"}.`);

    const me = guild.members.me!;
    const staff = staffFor(tickets, type?.name ?? null).filter((id) => guild.roles.cache.has(id));
    const categoryId = type?.categoryId ?? tickets.categoryId;
    const parent = categoryId && guild.channels.cache.get(categoryId)?.type === ChannelType.GuildCategory ? categoryId : undefined;
    const allow = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles];
    const prefix = type ? type.name.toLowerCase() : "ticket";

    const channel = await guild.channels.create({
        name: `${prefix}-${member.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 90) || `ticket-${member.id}`,
        type: ChannelType.GuildText,
        parent,
        topic: `${type?.name ?? "Ticket"} for ${member.user.tag}${options.topic ? `: ${options.topic}` : ""}`.slice(0, 1024),
        permissionOverwrites: [
            { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: member.id, type: OverwriteType.Member, allow },
            { id: me.id, type: OverwriteType.Member, allow: [...allow, PermissionFlagsBits.ManageChannels] },
            ...staff.map((id) => ({ id, type: OverwriteType.Role, allow }))
        ],
        reason: `Ticket opened by ${member.user.tag}`
    });

    const ticket = await Utility.openTicket({ guildId: guild.id, channelId: channel.id, ownerId: member.id, topic: options.topic ?? null, type: type?.name ?? null });

    const intro = renderMessage(tickets.openMessage, memberContext(member, { channelId: channel.id }), guild.id);
    const details = new VortexEmbed(guild.id).setTitle(`🎫 ${type?.name ?? "Ticket"} #${ticket.id}`);
    if (options.topic) details.addField("Topic", options.topic);
    for (const { question, answer } of options.answers ?? []) details.addField(question.slice(0, 256), answer.slice(0, 1024));
    if (!options.topic && !options.answers?.length) details.setDescription("Describe your issue below and staff will help you soon.");

    const pings = tickets.pingStaff ? staff.map((id) => `<@&${id}>`).join(" ") : "";
    await channel.send({
        content: [`${member}`, pings, intro.content].filter(Boolean).join(" "),
        embeds: [...intro.embeds, details],
        components: [controls(null)],
        allowedMentions: { users: [member.id], roles: tickets.pingStaff ? staff : [] }
    });

    return channel;
}

// Claim (or unclaim) the ticket in this channel. Staff only.
export async function toggleClaim(channel: TextChannel, member: GuildMember) {
    const ticket = await Utility.getTicketByChannel(channel.id);
    if (!ticket) throw new Error("This isn't an open ticket channel.");
    const { tickets } = (await DBManager.getGuildConfig(channel.guild.id)).settings;
    if (!isTicketStaff(member, tickets, ticket.type)) throw new Error("Only staff can claim tickets.");
    if (ticket.claimedBy && ticket.claimedBy !== member.id && !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        throw new Error(`<@${ticket.claimedBy}> is already handling this ticket.`);
    }

    const claiming = ticket.claimedBy !== member.id;
    await Utility.claimTicket(ticket.id, claiming ? member.id : null);
    return { claimed: claiming, controls: controls(claiming ? member.id : null) };
}

// Adds or removes someone from the ticket in this channel. Staff or the ticket owner only.
export async function setTicketAccess(channel: TextChannel, by: GuildMember, userId: string, access: boolean) {
    const ticket = await Utility.getTicketByChannel(channel.id);
    if (!ticket) throw new Error("Use this inside a ticket channel.");
    const { tickets } = (await DBManager.getGuildConfig(channel.guild.id)).settings;
    if (by.id !== ticket.ownerId && !isTicketStaff(by, tickets, ticket.type)) throw new Error("Only staff or the ticket owner can do that.");
    if (!access && userId === ticket.ownerId) throw new Error("You can't remove the ticket owner. Close the ticket instead.");

    if (access) await channel.permissionOverwrites.edit(userId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true });
    else await channel.permissionOverwrites.delete(userId);
}

// Closes the ticket in this channel: posts a transcript to the log channel, DMs it to the owner,
// then deletes the channel.
export async function closeTicket(channel: TextChannel, closedBy: GuildMember) {
    const ticket = await Utility.getTicketByChannel(channel.id);
    if (!ticket) throw new Error("This isn't an open ticket channel.");

    const { tickets } = (await DBManager.getGuildConfig(channel.guild.id)).settings;
    if (closedBy.id !== ticket.ownerId && !isTicketStaff(closedBy, tickets, ticket.type)) throw new Error("Only the ticket owner or staff can close this ticket.");

    await Utility.closeTicket(ticket.id, closedBy.id);

    // Last 500 messages, oldest first.
    const messages: Message[] = [];
    let before: string | undefined;
    for (let i = 0; i < 5; i++) {
        const batch = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
        if (!batch?.size) break;
        messages.push(...batch.values());
        before = batch.last()!.id;
    }
    messages.reverse();

    const html = tickets.transcriptFormat === "html";
    const transcript = () => new AttachmentBuilder(
        Buffer.from(html ? transcriptHtml(channel, ticket, messages) : transcriptText(messages)),
        { name: `ticket-${ticket.id}.${html ? "html" : "txt"}` }
    );
    const summary = new VortexEmbed(channel.guild.id).setTitle(`🎫 ${ticket.type ?? "Ticket"} #${ticket.id} closed`)
        .addField("Opened by", `<@${ticket.ownerId}>`, true)
        .addField("Closed by", `${closedBy}`, true)
        .addField("Handled by", ticket.claimedBy ? `<@${ticket.claimedBy}>` : "Nobody claimed it", true)
        .addField("Topic", ticket.topic || "None")
        .addField("Messages", messages.length.toLocaleString("en-US"), true);

    if (tickets.logChannelId) {
        const log = channel.guild.channels.cache.get(tickets.logChannelId);
        if (log?.isSendable()) await log.send({ embeds: [summary], files: [transcript()], allowedMentions: { parse: [] } }).catch(() => null);
    }
    // A copy for the member who opened it (fine if their DMs are closed).
    const owner = await channel.client.users.fetch(ticket.ownerId).catch(() => null);
    await owner?.send({ content: `Your ticket in **${channel.guild.name}** was closed. Here's a copy of the conversation.`, files: [transcript()] }).catch(() => null);

    await channel.send("🔒 Closing this ticket in 5 seconds…").catch(() => null);
    setTimeout(() => channel.delete(`Ticket closed by ${closedBy.user.tag}`).catch(() => null), 5000);
}

function transcriptText(messages: Message[]) {
    return messages.map((m) => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}${m.embeds.length ? ` [embed: ${m.embeds.map((e) => e.title ?? e.description?.slice(0, 80) ?? "").join(" | ")}]` : ""}${m.attachments.size ? ` [${m.attachments.map((a) => a.url).join(" ")}]` : ""}`).join("\n") || "(no messages)";
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]!);

// A self-contained web page that looks like the Discord channel (opens in any browser).
function transcriptHtml(channel: TextChannel, ticket: { id: number; type: string | null; topic: string | null }, messages: Message[]) {
    const rows = messages.map((m) => {
        const embeds = m.embeds.map((e) => `<div class="embed" style="border-color:${e.hexColor ?? "#6d6af0"}">${e.title ? `<b>${escapeHtml(e.title)}</b>` : ""}${e.description ? `<p>${escapeHtml(e.description)}</p>` : ""}${e.fields.map((f) => `<p><b>${escapeHtml(f.name)}</b><br>${escapeHtml(f.value)}</p>`).join("")}</div>`).join("");
        const files = m.attachments.map((a) => a.contentType?.startsWith("image/")
            ? `<a href="${escapeHtml(a.url)}"><img src="${escapeHtml(a.url)}" alt=""></a>`
            : `<a class="file" href="${escapeHtml(a.url)}">📎 ${escapeHtml(a.name)}</a>`).join("");
        return `<div class="msg"><img class="avatar" src="${escapeHtml(m.author.displayAvatarURL({ size: 64, extension: "png" }))}" alt=""><div><div class="meta"><b>${escapeHtml(m.member?.displayName ?? m.author.displayName)}</b>${m.author.bot ? `<span class="bot">APP</span>` : ""}<time>${m.createdAt.toUTCString()}</time></div><div class="content">${escapeHtml(m.content)}</div>${embeds}${files}</div></div>`;
    }).join("\n");

    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ticket #${ticket.id} · ${escapeHtml(channel.guild.name)}</title>
<style>body{margin:0;background:#313338;color:#dbdee1;font:15px/1.4 system-ui,sans-serif}header{padding:16px 24px;background:#2b2d31;border-bottom:1px solid #1e1f22}header h1{margin:0;font-size:18px;color:#fff}header p{margin:4px 0 0;color:#b5bac1;font-size:13px}main{padding:8px 24px 32px}.msg{display:flex;gap:12px;padding:8px 0}.avatar{width:40px;height:40px;border-radius:50%}.meta b{color:#fff}.meta time{margin-left:8px;color:#949ba4;font-size:12px}.bot{margin-left:6px;background:#5865f2;color:#fff;border-radius:3px;padding:0 4px;font-size:10px}.content{white-space:pre-wrap;word-break:break-word}.embed{margin-top:6px;max-width:520px;background:#2b2d31;border-left:4px solid;border-radius:4px;padding:8px 12px}.embed p{margin:4px 0;white-space:pre-wrap}img:not(.avatar){display:block;max-width:400px;max-height:300px;margin-top:6px;border-radius:4px}.file{display:inline-block;margin-top:6px;color:#00a8fc}</style></head>
<body><header><h1>#${escapeHtml(channel.name)} · ${escapeHtml(ticket.type ?? "Ticket")} #${ticket.id}</h1><p>${escapeHtml(channel.guild.name)} · ${messages.length} messages${ticket.topic ? ` · ${escapeHtml(ticket.topic)}` : ""} · exported ${new Date().toUTCString()}</p></header><main>
${rows || "<p>No messages.</p>"}
</main></body></html>`;
}

// ---------- Suggestions ----------

const STATUS = {
    open: { label: "Open", color: 0x6d6af0, emoji: "💡" },
    approved: { label: "Approved", color: 0x30a46c, emoji: "✅" },
    denied: { label: "Denied", color: 0xe5484d, emoji: "❌" },
    implemented: { label: "Implemented", color: 0xf5c542, emoji: "🚀" }
} as const;
export type SuggestionStatus = keyof typeof STATUS;

export function renderSuggestion(s: { id: number; authorId: string; content: string; status: string; response: string | null }, author?: { tag: string; avatar: string }) {
    const status = STATUS[s.status as SuggestionStatus] ?? STATUS.open;
    const embed = new VortexEmbed()
        .setTitle(`${status.emoji} Suggestion #${s.id}`)
        .setDescription(s.content)
        .setColor(status.color)
        .addField("Status", status.label, true)
        .addField("Suggested by", `<@${s.authorId}>`, true);
    if (author) embed.setAuthor({ name: author.tag, iconURL: author.avatar });
    if (s.response) embed.addField("Staff response", s.response);
    return embed;
}
