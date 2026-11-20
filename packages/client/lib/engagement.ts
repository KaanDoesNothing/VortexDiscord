import { container } from "@sapphire/framework";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    time,
    type Guild,
    type Message,
    type MessageReaction,
    type PartialMessageReaction
} from "discord.js";
import { DBManager, Engagement, type Giveaway, type Poll, type RolePanel } from "./database";
import { registerTask, schedule } from "./scheduler";
import { memberContext, renderMessage } from "./messages";
import { VortexEmbed } from "./structures/embed";

// Shared logic for role panels, giveaways, polls, starboard and birthdays.
// Button custom IDs are "<feature>:<id>:..." and handled in interaction-handlers/.

// ---------- Role panels ----------

// Builds (or rebuilds) a role panel message: an embed plus up to 25 buttons (5 per row), or a
// dropdown menu with the panel's roles.
export function renderRolePanel(panel: RolePanel) {
    const select = panel.style === "select";
    const embed = new VortexEmbed(panel.guildId).setTitle(panel.title).setDescription(panel.description || null)
        .setFooter({ text: panel.mode === "single"
            ? "Pick one: choosing a role removes the others"
            : select ? "Pick the roles you want from the menu; unpick them to remove" : "Click a button to add or remove the role" });

    if (select) {
        const menu = new StringSelectMenuBuilder()
            .setCustomId(`rolepanel:${panel.id}:menu`)
            .setPlaceholder(panel.mode === "single" ? "Choose a role…" : "Choose your roles…")
            .setMinValues(0)
            .setMaxValues(panel.mode === "single" ? 1 : Math.max(1, Math.min(25, panel.roles.length)))
            .addOptions(panel.roles.slice(0, 25).map((r) => {
                const option = new StringSelectMenuOptionBuilder().setLabel(r.label.slice(0, 100)).setValue(r.roleId);
                if (r.emoji) option.setEmoji(r.emoji);
                return option;
            }));
        return { embeds: [embed], components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)] };
    }

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    panel.roles.slice(0, 25).forEach((r, i) => {
        if (i % 5 === 0) rows.push(new ActionRowBuilder<ButtonBuilder>());
        const button = new ButtonBuilder().setCustomId(`rolepanel:${panel.id}:${r.roleId}`).setLabel(r.label.slice(0, 80)).setStyle(ButtonStyle.Secondary);
        if (r.emoji) button.setEmoji(r.emoji);
        rows.at(-1)!.addComponents(button);
    });

    return { embeds: [embed], components: rows };
}

// Posts a panel, or edits its existing message if it's still there. Returns the message ID.
export async function publishRolePanel(guild: Guild, panel: RolePanel) {
    const channel = await guild.channels.fetch(panel.channelId).catch(() => null);
    if (!channel?.isSendable() || !channel.isTextBased()) throw new Error("The bot can't post in that channel");

    const payload = renderRolePanel(panel);
    const existing = panel.messageId ? await channel.messages.fetch(panel.messageId).catch(() => null) : null;

    const message = existing ? await existing.edit(payload) : await channel.send(payload);
    if (!existing) await Engagement.setRolePanelMessage(panel.id, message.id);
    return message.id;
}

// ---------- Giveaways ----------

const pickRandom = (items: string[], n: number) => {
    const pool = [...items];
    const out: string[] = [];
    while (pool.length && out.length < n) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!);
    return out;
};

export function renderGiveaway(g: Giveaway) {
    const embed = new VortexEmbed()
        .setTitle(`🎉 ${g.prize}`)
        .setColor(g.ended ? 0x8e8c99 : 0x6d6af0);

    if (g.ended) {
        embed.setDescription(`${g.winners.length ? `**Winner${g.winners.length > 1 ? "s" : ""}:** ${g.winners.map((w) => `<@${w}>`).join(", ")}` : "No one entered. 😢"}\nHosted by <@${g.hostId}>`)
            .setFooter({ text: `${g.entrants.length} entries · ended` });
    } else {
        embed.setDescription(`Click **🎉 Enter** to join!\nEnds ${time(g.endsAt, "R")} (${time(g.endsAt, "f")})\nWinners: **${g.winnerCount}** · Hosted by <@${g.hostId}>`)
            .setFooter({ text: `${g.entrants.length} entries · ID ${g.id}` });
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`giveaway:${g.id}`).setLabel("Enter").setEmoji("🎉").setStyle(ButtonStyle.Primary).setDisabled(g.ended)
    );
    return { embeds: [embed], components: [row] };
}

// Ends a giveaway (if it hasn't ended yet), picks winners, updates its message and announces them.
export async function concludeGiveaway(id: number) {
    const existing = await Engagement.getGiveaway(id);
    if (!existing || existing.ended) return null;

    const g = await Engagement.finishGiveaway(id, (entrants) => pickRandom(entrants, existing.winnerCount));
    if (!g) return null;

    await announceGiveaway(g, false);
    return g;
}

export async function rerollGiveaway(id: number) {
    const g = await Engagement.rerollGiveaway(id, (entrants, previous) => {
        // Prefer people who didn't win last time.
        const fresh = entrants.filter((e) => !previous.includes(e));
        return pickRandom(fresh.length ? fresh : entrants, previous.length || 1);
    });
    if (g) await announceGiveaway(g, true);
    return g;
}

async function announceGiveaway(g: Giveaway, reroll: boolean) {
    const channel = await container.client.channels.fetch(g.channelId).catch(() => null);
    if (!channel?.isSendable() || !channel.isTextBased()) return;

    const message = g.messageId ? await channel.messages.fetch(g.messageId).catch(() => null) : null;
    await message?.edit(renderGiveaway(g)).catch(() => null);

    const text = g.winners.length
        ? `🎉 ${reroll ? "New winner" : "Congratulations"} ${g.winners.map((w) => `<@${w}>`).join(", ")}! You won **${g.prize}**!`
        : `Nobody entered the giveaway for **${g.prize}**.`;
    await channel.send({ content: text, reply: message ? { messageReference: message.id, failIfNotExists: false } : undefined, allowedMentions: { users: g.winners } });
}

// Starts a giveaway: posts the message and schedules the end.
export async function startGiveaway(input: { guild: Guild; channelId: string; prize: string; winnerCount: number; hostId: string; durationMs: number }) {
    const channel = await input.guild.channels.fetch(input.channelId).catch(() => null);
    if (!channel?.isSendable()) throw new Error("The bot can't post in that channel");

    const g = await Engagement.createGiveaway({
        guildId: input.guild.id,
        channelId: input.channelId,
        prize: input.prize,
        winnerCount: input.winnerCount,
        hostId: input.hostId,
        endsAt: new Date(Date.now() + input.durationMs)
    });

    const message = await channel.send(renderGiveaway(g));
    await Engagement.setGiveawayMessage(g.id, message.id);
    await schedule({ type: "giveaway_end", guildId: input.guild.id, runAt: g.endsAt, payload: { giveawayId: g.id }, createdBy: input.hostId });
    return { ...g, messageId: message.id };
}

registerTask("giveaway_end", async (task) => {
    await concludeGiveaway((task.payload as { giveawayId: number }).giveawayId);
});

// ---------- Polls ----------

const POLL_EMOJI = ["🇦", "🇧", "🇨", "🇩", "🇪", "🇫", "🇬", "🇭", "🇮", "🇯"];

// Poll message with a live bar per option. Bars use text blocks so they work everywhere.
export function renderPoll(poll: Poll, counts: number[]) {
    const total = counts.reduce((a, b) => a + b, 0);
    const lines = poll.options.map((option, i) => {
        const votes = counts[i] ?? 0;
        const pct = total ? Math.round((votes / total) * 100) : 0;
        const bar = "█".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));
        return `${POLL_EMOJI[i]} **${option}**\n\`${bar}\` ${pct}% (${votes})`;
    });

    const embed = new VortexEmbed()
        .setTitle(`📊 ${poll.question}`)
        .setDescription(lines.join("\n\n"))
        .setFooter({ text: `${total} vote${total === 1 ? "" : "s"}${poll.closed ? " · closed" : " · click to vote, click again to remove"}` })
        .setColor(poll.closed ? 0x8e8c99 : 0x6d6af0);

    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    if (!poll.closed) {
        poll.options.forEach((option, i) => {
            if (i % 5 === 0) rows.push(new ActionRowBuilder<ButtonBuilder>());
            rows.at(-1)!.addComponents(new ButtonBuilder().setCustomId(`poll:${poll.id}:${i}`).setEmoji(POLL_EMOJI[i]!).setLabel(option.slice(0, 70)).setStyle(ButtonStyle.Secondary));
        });
        const control = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`poll:${poll.id}:close`).setLabel("End poll").setStyle(ButtonStyle.Danger)
        );
        rows.push(control);
    }
    return { embeds: [embed], components: rows };
}

export async function closePoll(id: number) {
    const poll = await Engagement.closePoll(id);
    if (!poll) return null;

    const counts = await Engagement.pollResults(poll.id, poll.options.length);
    const channel = await container.client.channels.fetch(poll.channelId).catch(() => null);
    if (channel?.isTextBased() && poll.messageId) {
        const message = await channel.messages.fetch(poll.messageId).catch(() => null);
        await message?.edit(renderPoll(poll, counts)).catch(() => null);
    }
    return poll;
}

registerTask("poll_end", async (task) => {
    await closePoll((task.payload as { pollId: number }).pollId);
});

// ---------- Starboard ----------

// Called on every reaction add/remove. Posts the message to the starboard once it reaches the
// threshold, keeps the star count updated, and removes it if it drops below.
export async function updateStarboard(reaction: MessageReaction | PartialMessageReaction) {
    const message = reaction.message.partial ? await reaction.message.fetch().catch(() => null) : reaction.message as Message;
    if (!message?.inGuild()) return;

    const { starboard } = (await DBManager.getGuildConfig(message.guildId)).settings;
    if (!starboard.enabled || !starboard.channelId || message.channelId === starboard.channelId) return;
    const parentId = message.channel.isThread() ? message.channel.parentId : null;
    if (starboard.ignoredChannelIds.includes(message.channelId) || (parentId && starboard.ignoredChannelIds.includes(parentId))) return;
    // Age-restricted messages stay off the starboard unless allowed (or the starboard is age-restricted too).
    const nsfw = "nsfw" in message.channel && message.channel.nsfw;

    // Only the configured emoji (unicode or custom <:name:id>) counts.
    const matches = (r: MessageReaction) => r.emoji.id ? starboard.emoji.includes(r.emoji.id) : r.emoji.name === starboard.emoji;
    const starReaction = message.reactions.cache.find(matches);

    let stars = starReaction?.count ?? 0;
    if (starReaction && !starboard.allowSelfStar) {
        const users = await starReaction.users.fetch().catch(() => null);
        if (users?.has(message.author.id)) stars--;
    }

    const channel = message.guild.channels.cache.get(starboard.channelId) ?? await message.guild.channels.fetch(starboard.channelId).catch(() => null);
    if (!channel?.isSendable() || !channel.isTextBased()) return;
    if (nsfw && !starboard.allowNsfw && !("nsfw" in channel && channel.nsfw)) return;

    const entry = await Engagement.getStarboardEntry(message.guildId, message.id);
    const existing = entry ? await channel.messages.fetch(entry.starboardMessageId).catch(() => null) : null;

    // Below the threshold: take it off the starboard.
    if (stars < starboard.threshold) {
        if (existing) await existing.delete().catch(() => null);
        if (entry) await Engagement.deleteStarboardEntry(message.guildId, message.id);
        return;
    }

    const embed = new VortexEmbed()
        .setAuthor({ name: message.author.displayName, iconURL: message.author.displayAvatarURL() })
        .setDescription(message.content.slice(0, 4000) || null)
        .addField("Source", `[Jump to message](${message.url}) in ${message.channel}`)
        .setColor(0xf5c542)
        .setTimestamp(message.createdAt);

    const image = message.attachments.find((a) => a.contentType?.startsWith("image/"));
    if (image) embed.setImage(image.url);

    const content = `${starboard.emoji} **${stars}** · ${message.channel}`;
    if (existing) {
        await existing.edit({ content, embeds: [embed] });
        await Engagement.saveStarboardEntry(message.guildId, message.id, existing.id, stars);
    } else {
        const posted = await channel.send({ content, embeds: [embed], allowedMentions: { parse: [] } });
        await Engagement.saveStarboardEntry(message.guildId, message.id, posted.id, stars);
    }
}

// ---------- Birthdays ----------

// Runs once a day shortly after midnight UTC and announces today's birthdays in every server that
// has birthday announcements on and where the person is a member.
registerTask("birthday_sweep", async () => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const userIds = await Engagement.birthdaysOn(now.getUTCMonth() + 1, now.getUTCDate(), isLeap);
    if (!userIds.length) return;

    for (const guild of container.client.guilds.cache.values()) {
        const { birthdays } = (await DBManager.getGuildConfig(guild.id)).settings;
        if (!birthdays.enabled || !birthdays.channelId) continue;

        const channel = guild.channels.cache.get(birthdays.channelId);
        if (!channel?.isSendable()) continue;

        // Look up only the people with a birthday today, one by one over REST
        // (doesn't need the Server Members intent). Non-members come back null and are skipped.
        const members = await Promise.all(userIds.map((id) => guild.members.fetch(id).catch(() => null)));
        for (const member of members) {
            if (!member) continue;
            const payload = renderMessage(birthdays.message, memberContext(member), guild.id);
            await channel.send({ ...payload, allowedMentions: { users: [member.id] } }).catch(() => null);
        }
    }
});

// Makes sure exactly one daily birthday sweep is scheduled (called on startup).
export async function ensureBirthdaySweep() {
    const { Utility } = await import("./database");
    const existing = await Utility.listTasks("", ["birthday_sweep"]).catch(() => []);
    if (existing.length) return;

    const next = new Date();
    next.setUTCHours(0, 5, 0, 0);
    if (next <= new Date()) next.setUTCDate(next.getUTCDate() + 1);
    await schedule({ type: "birthday_sweep", guildId: "", runAt: next, repeatMinutes: 24 * 60 });
}
