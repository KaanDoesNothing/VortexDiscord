import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { DBManager, Engagement } from "../../lib/database";
import { renderRankCard } from "../../lib/images";
import { VortexCommand } from "../../lib/structures/command";

// /rank [member]: a rank card with level, server rank and progress to the next level.
export class RankCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["level", "xp"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("rank")
        .setDescription("Show a rank card with your level and progress on this server")
        .addUserOption((o) => o.setName("member").setDescription("Whose rank to show (defaults to you)"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("member") ?? ctx.user;
        if (user.bot) return ctx.reply({ content: "Bots don't level up.", ephemeral: true });

        const { settings } = await DBManager.getGuildConfig(ctx.guildId!);
        if (!settings.leveling.enabled) return ctx.reply({ content: "Leveling is turned off on this server.", ephemeral: true });

        await ctx.deferReply();

        const data = await Engagement.getRank(ctx.guildId!, user.id);
        const perLevel = settings.leveling.messagesPerLevel;
        const level = data?.level ?? 1;
        const messages = data?.messages ?? 0;
        // Messages counted toward the current level (levels are messages / perLevel + 1).
        const current = messages % perLevel;

        const image = await renderRankCard({ user, level, rank: data?.rank ?? null, progress: current / perLevel, current, needed: perLevel });
        return ctx.editReply({ files: [{ name: "rank.png", attachment: image }] });
    }
}
