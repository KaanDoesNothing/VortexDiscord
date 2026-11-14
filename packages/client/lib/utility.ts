import { container } from "@sapphire/framework";
import {
    ActionRowBuilder,
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    OverwriteType,
    PermissionFlagsBits,
    time,
    type Guild,
    type GuildMember,
    type TextChannel
} from "discord.js";
import { DBManager, Utility } from "./database";
import { registerTask } from "./scheduler";
import { renderTemplate } from "./settings";
import { VortexEmbed } from "./structures/embed";

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

// Payload: { channelId, content, embed: { title, description, color } | null }
registerTask("announcement", async (task) => {
    const { channelId, content, embed } = task.payload as { channelId: string; content?: string; embed?: { title?: string; description?: string; color?: string; image?: string; footer?: string } | null };
    const guild = container.client.guilds.cache.get(task.guildId ?? "");
    const channel = guild?.channels.cache.get(channelId);
    if (!channel?.isSendable()) return;

    const embeds = embed && (embed.title || embed.description || embed.image)
        ? [new VortexEmbed().setTitle(embed.title || null).setDescription(embed.description || null).setColor(embed.color ? parseInt(embed.color.replace("#", ""), 16) : 0x6d6af0)
            .setImage(embed.image ?? null).setFooter(embed.footer ? { text: embed.footer } : null)]
        : [];

    // Announcements may ping roles/everyone on purpose (it's an admin feature).
    await channel.send({ content: content || undefined, embeds, allowedMentions: { parse: ["roles", "everyone", "users"] } });
});

// ---------- Tickets ----------

export const ticketPanelButton = () => new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ticket:open").setLabel("Open a ticket").setEmoji("🎫").setStyle(ButtonStyle.Primary)
);

const closeButton = () => new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ticket:close").setLabel("Close ticket").setEmoji("🔒").setStyle(ButtonStyle.Danger)
);

// Creates a private channel only the member, staff roles and the bot can see.
export async function openTicket(guild: Guild, member: GuildMember, topic: string | null) {
    const { tickets } = (await DBManager.getGuildConfig(guild.id)).settings;
    if (!tickets.enabled) throw new Error("Tickets aren't enabled on this server.");

    const open = await Utility.countOpenTickets(guild.id, member.id);
    if (open >= tickets.maxOpenPerUser) throw new Error(`You already have ${open} open ticket${open === 1 ? "" : "s"}.`);

    const me = guild.members.me!;
    const staff = tickets.staffRoleIds.filter((id) => guild.roles.cache.has(id));
    const parent = tickets.categoryId && guild.channels.cache.get(tickets.categoryId)?.type === ChannelType.GuildCategory ? tickets.categoryId : undefined;
    const allow = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles];

    const channel = await guild.channels.create({
        name: `ticket-${member.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 90) || `ticket-${member.id}`,
        type: ChannelType.GuildText,
        parent,
        topic: `Ticket for ${member.user.tag}${topic ? `: ${topic}` : ""}`,
        permissionOverwrites: [
            { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: member.id, type: OverwriteType.Member, allow },
            { id: me.id, type: OverwriteType.Member, allow: [...allow, PermissionFlagsBits.ManageChannels] },
            ...staff.map((id) => ({ id, type: OverwriteType.Role, allow }))
        ],
        reason: `Ticket opened by ${member.user.tag}`
    });

    await Utility.openTicket({ guildId: guild.id, channelId: channel.id, ownerId: member.id, topic });

    const intro = renderTemplate(tickets.openMessage, {
        user: { id: member.id, username: member.user.username, displayName: member.displayName },
        server: { name: guild.name, memberCount: guild.memberCount }
    });
    const embed = new VortexEmbed().setTitle("🎫 Ticket opened").setDescription(intro);
    if (topic) embed.addField("Topic", topic);

    await channel.send({
        content: `${member} ${staff.map((id) => `<@&${id}>`).join(" ")}`,
        embeds: [embed],
        components: [closeButton()],
        allowedMentions: { users: [member.id], roles: staff }
    });

    return channel;
}

// Closes the ticket in this channel: posts a transcript to the log channel, then deletes the channel.
export async function closeTicket(channel: TextChannel, closedBy: GuildMember) {
    const ticket = await Utility.getTicketByChannel(channel.id);
    if (!ticket) throw new Error("This isn't an open ticket channel.");

    const { tickets } = (await DBManager.getGuildConfig(channel.guild.id)).settings;
    const isStaff = tickets.staffRoleIds.some((id) => closedBy.roles.cache.has(id)) || closedBy.permissions.has(PermissionFlagsBits.ManageChannels);
    if (closedBy.id !== ticket.ownerId && !isStaff) throw new Error("Only the ticket owner or staff can close this ticket.");

    await Utility.closeTicket(ticket.id, closedBy.id);

    // Plain-text transcript of the last 500 messages.
    if (tickets.logChannelId) {
        const log = channel.guild.channels.cache.get(tickets.logChannelId);
        if (log?.isSendable()) {
            const lines: string[] = [];
            let before: string | undefined;
            for (let i = 0; i < 5; i++) {
                const batch = await channel.messages.fetch({ limit: 100, before }).catch(() => null);
                if (!batch?.size) break;
                for (const m of batch.values()) lines.push(`[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}${m.attachments.size ? ` [${m.attachments.map((a) => a.url).join(" ")}]` : ""}`);
                before = batch.last()!.id;
            }
            const transcript = new AttachmentBuilder(Buffer.from(lines.reverse().join("\n") || "(no messages)"), { name: `ticket-${ticket.id}.txt` });
            await log.send({
                embeds: [new VortexEmbed().setTitle(`🎫 Ticket #${ticket.id} closed`)
                    .addField("Opened by", `<@${ticket.ownerId}>`, true)
                    .addField("Closed by", `${closedBy}`, true)
                    .addField("Topic", ticket.topic || "None")],
                files: [transcript],
                allowedMentions: { parse: [] }
            }).catch(() => null);
        }
    }

    await channel.send("🔒 Closing this ticket in 5 seconds…").catch(() => null);
    setTimeout(() => channel.delete(`Ticket closed by ${closedBy.user.tag}`).catch(() => null), 5000);
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
