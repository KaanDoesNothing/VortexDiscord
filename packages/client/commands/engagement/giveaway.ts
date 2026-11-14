import { Command } from "@sapphire/framework";
import { ChannelType, SlashCommandBuilder, time } from "discord.js";
import { Engagement } from "../../lib/database";
import { concludeGiveaway, rerollGiveaway, startGiveaway } from "../../lib/engagement";
import { formatDuration, parseDuration } from "../../lib/scheduler";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /giveaway start|end|reroll|list: timed giveaways with an Enter button. Ending is scheduled,
// so giveaways finish on time even if the bot restarts in between.
export class GiveawayCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["gw"], requiredUserPermissions: ["ManageGuild"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("giveaway")
        .setDescription("Run giveaways with an Enter button and random winners")
        .addSubcommand((s) => s.setName("start").setDescription("Start a giveaway")
            .addStringOption((o) => o.setName("duration").setDescription("How long it runs, e.g. 1h, 2d").setRequired(true))
            .addIntegerOption((o) => o.setName("winners").setDescription("Number of winners").setMinValue(1).setMaxValue(20).setRequired(true))
            .addStringOption((o) => o.setName("prize").setDescription("What they win").setMaxLength(200).setRequired(true))
            .addChannelOption((o) => o.setName("channel").setDescription("Where to post it (defaults to here)").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)))
        .addSubcommand((s) => s.setName("end").setDescription("End a giveaway now and pick winners")
            .addIntegerOption((o) => o.setName("id").setDescription("Giveaway ID (shown in its footer)").setRequired(true)))
        .addSubcommand((s) => s.setName("reroll").setDescription("Pick new winners for an ended giveaway")
            .addIntegerOption((o) => o.setName("id").setDescription("Giveaway ID").setRequired(true)))
        .addSubcommand((s) => s.setName("list").setDescription("Show this server's recent giveaways"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guild = ctx.guild!;

        switch (ctx.options.getSubcommand()) {
            case "start": {
                const durationMs = parseDuration(ctx.options.getString("duration", true));
                if (!durationMs || durationMs < 60_000 || durationMs > 60 * 86_400_000) {
                    return ctx.reply({ content: "Give a duration between `1m` and `60d`, e.g. `1h` or `2d`.", ephemeral: true });
                }

                const channel = ctx.options.getChannel("channel") ?? ctx.channel;
                const g = await startGiveaway({
                    guild,
                    channelId: channel!.id,
                    prize: ctx.options.getString("prize", true),
                    winnerCount: ctx.options.getInteger("winners", true),
                    hostId: ctx.user.id,
                    durationMs
                }).catch((error: Error) => error);

                if (g instanceof Error) return ctx.reply({ content: g.message, ephemeral: true });
                return ctx.reply({ content: `🎉 Giveaway #${g.id} started in <#${g.channelId}>. It ends in ${formatDuration(durationMs)}.`, ephemeral: true });
            }

            case "end": {
                const id = ctx.options.getInteger("id", true);
                const g = await Engagement.getGiveaway(id);
                if (!g || g.guildId !== guild.id) return ctx.reply({ content: "No giveaway with that ID here.", ephemeral: true });
                if (g.ended) return ctx.reply({ content: "That giveaway already ended. Use `/giveaway reroll` for new winners.", ephemeral: true });

                await concludeGiveaway(id);
                return ctx.reply({ content: `Giveaway #${id} ended.`, ephemeral: true });
            }

            case "reroll": {
                const id = ctx.options.getInteger("id", true);
                const g = await Engagement.getGiveaway(id);
                if (!g || g.guildId !== guild.id) return ctx.reply({ content: "No giveaway with that ID here.", ephemeral: true });
                if (!g.ended) return ctx.reply({ content: "That giveaway hasn't ended yet.", ephemeral: true });

                await rerollGiveaway(id);
                return ctx.reply({ content: `Rerolled giveaway #${id}.`, ephemeral: true });
            }

            case "list": {
                const list = (await Engagement.listGiveaways(guild.id)).slice(0, 15);
                const embed = new VortexEmbed().setTitle("Giveaways").setDescription(list.length
                    ? list.map((g) => `\`#${g.id}\` **${g.prize}**: ${g.ended ? "ended" : `ends ${time(g.endsAt, "R")}`} · ${g.entrants.length} entries · <#${g.channelId}>`).join("\n")
                    : "No giveaways yet. Start one with `/giveaway start`.");
                return ctx.reply({ embeds: [embed], ephemeral: true });
            }
        }
    }
}
