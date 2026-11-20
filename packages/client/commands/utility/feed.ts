import { Command } from "@sapphire/framework";
import { ChannelType, MessageFlags, SlashCommandBuilder, type AutocompleteInteraction } from "discord.js";
import { createFeed, deleteFeed, DEFAULT_MESSAGES, FEED_TYPES, listFeeds, MAX_FEEDS_PER_GUILD, resolveSource, type FeedType } from "../../lib/feeds";
import { VortexCommand } from "../../lib/structures/command";
import { fail, ok, VortexEmbed } from "../../lib/structures/embed";

const LABELS: Record<FeedType, string> = { youtube: "YouTube channel", twitch: "Twitch streamer", reddit: "Subreddit", rss: "RSS / Atom feed" };
const ICONS: Record<FeedType, string> = { youtube: "📺", twitch: "🟣", reddit: "🟠", rss: "📰" };

// /feed add|remove|list: post new YouTube videos, Twitch streams, Reddit posts or RSS items in a channel.
export class FeedCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["feeds"], requiredUserPermissions: ["ManageGuild"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("feed")
        .setDescription("Post new YouTube videos, Twitch streams, Reddit posts or RSS items here (admins)")
        .addSubcommand((s) => s.setName("add").setDescription("Follow a channel, streamer, subreddit or feed")
            .addStringOption((o) => o.setName("type").setDescription("What to follow").setRequired(true).addChoices(...FEED_TYPES.map((t) => ({ name: LABELS[t], value: t }))))
            .addStringOption((o) => o.setName("source").setDescription("Link, @handle, username, subreddit or feed URL").setMaxLength(300).setRequired(true))
            .addChannelOption((o) => o.setName("channel").setDescription("Where to post (defaults to here)").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
            .addRoleOption((o) => o.setName("ping").setDescription("Role to ping with each post"))
            .addStringOption((o) => o.setName("message").setDescription("Custom message: {title}, {url} and {author} work").setMaxLength(1000)))
        .addSubcommand((s) => s.setName("remove").setDescription("Stop following something")
            .addStringOption((o) => o.setName("feed").setDescription("Which feed").setRequired(true).setAutocomplete(true)))
        .addSubcommand((s) => s.setName("list").setDescription("Everything this server follows"));

    public override async autocompleteRun(interaction: AutocompleteInteraction) {
        const query = interaction.options.getFocused().toLowerCase();
        const list = await listFeeds(interaction.guildId!);
        return interaction.respond(list.filter((f) => f.label.toLowerCase().includes(query)).slice(0, 25)
            .map((f) => ({ name: `${LABELS[f.type as FeedType] ?? f.type}: ${f.label}`.slice(0, 100), value: String(f.id) })));
    }

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guildId = ctx.guildId!;
        const list = await listFeeds(guildId);

        switch (ctx.options.getSubcommand()) {
            case "add": {
                if (list.length >= MAX_FEEDS_PER_GUILD) return ctx.reply(fail(`A server can follow at most ${MAX_FEEDS_PER_GUILD} feeds.`));
                const type = ctx.options.getString("type", true) as FeedType;
                const channel = ctx.options.getChannel("channel") ?? ctx.channel!;
                await ctx.deferReply({ flags: MessageFlags.Ephemeral });

                try {
                    const { source, label } = await resolveSource(type, ctx.options.getString("source", true));
                    if (list.some((f) => f.type === type && f.source === source && f.channelId === channel.id)) return ctx.editReply({ embeds: fail("That's already followed in that channel.").embeds });
                    await createFeed({ guildId, type, source, label, channelId: channel.id, message: ctx.options.getString("message") ?? "", pingRoleId: ctx.options.getRole("ping")?.id ?? null });
                    return ctx.editReply({ embeds: ok(`${ICONS[type]} Following **${label}**. New posts go to <#${channel.id}> (checked every 5 minutes).`).embeds });
                } catch (error) {
                    return ctx.editReply({ embeds: fail((error as Error).message).embeds });
                }
            }
            case "remove": {
                const input = ctx.options.getString("feed", true);
                const feed = list.find((f) => String(f.id) === input || f.label.toLowerCase() === input.toLowerCase());
                if (!feed) return ctx.reply(fail("This server doesn't follow that."));
                await deleteFeed(guildId, feed.id);
                return ctx.reply(ok(`Stopped following **${feed.label}**.`));
            }
            default: {
                const embed = new VortexEmbed().setTitle("Social feeds")
                    .setDescription(list.map((f) => `${ICONS[f.type as FeedType] ?? "📰"} **${f.label}** → <#${f.channelId}>${f.pingRoleId ? ` (pings <@&${f.pingRoleId}>)` : ""}${f.failures > 3 ? " ⚠️ failing" : ""}`).join("\n") || "Nothing followed yet. Add something with `/feed add`.")
                    .setFooter({ text: `Default message: ${DEFAULT_MESSAGES.youtube.split("\n")[0]}` });
                return ctx.reply({ embeds: [embed], allowedMentions: { parse: [] } });
            }
        }
    }
}
