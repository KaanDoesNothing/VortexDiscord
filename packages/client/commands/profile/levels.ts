import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { DBManager, Engagement } from "../../lib/database";
import { flushXp, levelFromXp } from "../../lib/leveling";
import { VortexCommand } from "../../lib/structures/command";
import { fail, VortexEmbed } from "../../lib/structures/embed";

const MEDALS = ["🥇", "🥈", "🥉"];
const PAGE_SIZE = 10;

// /levels [page]: the server's XP leaderboard. Links the public web page when the server has it on.
export class LevelsCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["lb", "top"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("levels")
        .setDescription("Show the most active members on this server by level and XP")
        .addIntegerOption((o) => o.setName("page").setDescription("Which page (10 members each)").setMinValue(1).setMaxValue(1000));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const { settings } = await DBManager.getGuildConfig(ctx.guildId!);
        if (!settings.leveling.enabled) return ctx.reply(fail("Leveling is turned off on this server."));

        const page = ctx.options.getInteger("page") ?? 1;
        await flushXp();
        const rows = await Engagement.topByXp(ctx.guildId!, PAGE_SIZE, (page - 1) * PAGE_SIZE);

        const lines = rows.map((r, i) => {
            const rank = (page - 1) * PAGE_SIZE + i + 1;
            const level = levelFromXp(r.xp, settings.leveling.difficulty);
            return `${MEDALS[rank - 1] ?? `\`#${rank}\``} <@${r.userId}> · level **${level}** · ${r.xp.toLocaleString("en-US")} XP`;
        });

        const embed = new VortexEmbed()
            .setTitle(`📈 ${ctx.guild!.name} levels`)
            .setDescription(lines.join("\n") || (page === 1 ? "Nobody has earned XP yet. Start chatting!" : "Nothing on this page."))
            .setFooter({ text: `Page ${page} · /rank for your own card` });

        // Public leaderboard page (Dashboard → Leveling → "Public leaderboard").
        const site = Bun.env.FRONTEND_URL?.replace(/\/$/, "");
        if (settings.leveling.publicLeaderboard && site) embed.setURL(`${site}/leaderboard/${ctx.guildId}`);

        return ctx.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
}
