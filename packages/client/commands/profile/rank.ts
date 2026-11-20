import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { DBManager, Engagement } from "../../lib/database";
import { renderRankCard } from "../../lib/images";
import { flushXp, levelProgress } from "../../lib/leveling";
import { VortexCommand } from "../../lib/structures/command";

// /rank [member]: a rank card with level, server rank and progress to the next level.
export class RankCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["level"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("rank")
        .setDescription("Show a rank card with your level and progress on this server")
        .addUserOption((o) => o.setName("member").setDescription("Whose rank to show (defaults to you)"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("member") ?? ctx.user;
        if (user.bot) return ctx.reply({ content: "Bots don't level up.", flags: MessageFlags.Ephemeral });

        const { settings } = await DBManager.getGuildConfig(ctx.guildId!);
        if (!settings.leveling.enabled) return ctx.reply({ content: "Leveling is turned off on this server.", flags: MessageFlags.Ephemeral });

        await ctx.deferReply();

        // Include XP earned in the last few seconds that isn't saved yet.
        await flushXp();
        const data = await Engagement.getRank(ctx.guildId!, user.id);
        const { level, current, needed, progress } = levelProgress(data?.xp ?? 0, settings.leveling.difficulty);
        const { accentColor, backgroundUrl } = settings.leveling.card;

        const image = await renderRankCard({ user, level, rank: data?.rank ?? null, progress, current, needed, accent: accentColor, backgroundUrl });
        return ctx.editReply({ files: [{ name: "rank.png", attachment: image }] });
    }
}
