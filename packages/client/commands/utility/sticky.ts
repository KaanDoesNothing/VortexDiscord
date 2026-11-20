import { Command } from "@sapphire/framework";
import { ChannelType, SlashCommandBuilder, type GuildTextBasedChannel } from "discord.js";
import { listStickies, removeSticky, repostSticky, setSticky } from "../../lib/sticky";
import { VortexCommand } from "../../lib/structures/command";
import { fail, ok, VortexEmbed } from "../../lib/structures/embed";

const MAX_PER_SERVER = 10;

// /sticky set|remove|list: keep a message at the bottom of a channel (rules, links, reminders...).
export class StickyCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, requiredUserPermissions: ["ManageMessages"], requiredClientPermissions: ["ManageMessages"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("sticky")
        .setDescription("Keep a message pinned to the bottom of a channel")
        .addSubcommand((s) => s.setName("set").setDescription("Set (or replace) the sticky message in a channel")
            .addStringOption((o) => o.setName("message").setDescription("What it says").setMaxLength(2000).setRequired(true))
            .addChannelOption((o) => o.setName("channel").setDescription("Which channel (defaults to here)").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
            .addBooleanOption((o) => o.setName("embed").setDescription("Show it as an embed")))
        .addSubcommand((s) => s.setName("remove").setDescription("Remove a channel's sticky message")
            .addChannelOption((o) => o.setName("channel").setDescription("Which channel (defaults to here)").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
        .addSubcommand((s) => s.setName("list").setDescription("Every sticky message on this server"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guildId = ctx.guildId!;
        const channel = (ctx.options.getChannel("channel") ?? ctx.channel) as GuildTextBasedChannel;

        switch (ctx.options.getSubcommand()) {
            case "set": {
                const existing = await listStickies(guildId);
                if (existing.length >= MAX_PER_SERVER && !existing.some((s) => s.channelId === channel.id)) return ctx.reply(fail(`A server can have at most ${MAX_PER_SERVER} sticky messages.`));
                const sticky = await setSticky({ guildId, channelId: channel.id, content: ctx.options.getString("message", true), embed: ctx.options.getBoolean("embed") ?? false, createdBy: ctx.user.id });
                await ctx.reply(ok(`Sticky message set in ${channel}.`, true));
                // Post it right away (replacing the old sticky's message, if any).
                await repostSticky(channel, sticky);
                return;
            }
            case "remove": {
                const removed = await removeSticky(channel.id);
                if (!removed) return ctx.reply(fail(`${channel} has no sticky message.`));
                if (removed.lastMessageId) await channel.messages.delete(removed.lastMessageId).catch(() => null);
                return ctx.reply(ok(`Removed the sticky message from ${channel}.`, true));
            }
            default: {
                const list = await listStickies(guildId);
                const embed = new VortexEmbed().setTitle("📌 Sticky messages")
                    .setDescription(list.map((s) => `<#${s.channelId}>: ${s.content.slice(0, 100)}${s.content.length > 100 ? "…" : ""}`).join("\n") || "None. Add one with `/sticky set`.");
                return ctx.reply({ embeds: [embed] });
            }
        }
    }
}
