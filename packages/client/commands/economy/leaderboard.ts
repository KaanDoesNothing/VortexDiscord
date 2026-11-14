import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { Economy } from "../../lib/database";
import { getCurrency } from "../../lib/economy";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

const MEDALS = ["🥇", "🥈", "🥉"];

// /leaderboard [scope]: richest users on this server or everywhere (wallet + bank).
export class LeaderboardCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["lb", "rich"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("The richest users on this server, or across every server")
        .addStringOption((o) => o.setName("scope").setDescription("Which leaderboard").addChoices(
            { name: "This server", value: "server" },
            { name: "Global", value: "global" }
        ));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const scope = ctx.options.getString("scope") === "global" || !ctx.guildId ? "global" : "server";
        const [rows, currency] = await Promise.all([
            scope === "global" ? Economy.globalLeaderboard(10) : Economy.serverLeaderboard(ctx.guildId!, 10),
            getCurrency(ctx.guildId)
        ]);

        // Usernames for people the bot doesn't have cached.
        const names = await Promise.all(rows.map(async (r) => {
            const user = ctx.client.users.cache.get(r.id) ?? await ctx.client.users.fetch(r.id).catch(() => null);
            return user?.displayName ?? `Unknown (${r.id})`;
        }));

        const lines = rows.map((r, i) => `${MEDALS[i] ?? `\`#${i + 1}\``} **${names[i]}**: ${currency.format(r.total)}`);

        const embed = new VortexEmbed()
            .setTitle(scope === "global" ? "🌍 Global leaderboard" : `🏆 ${ctx.guild!.name} leaderboard`)
            .setDescription(lines.join("\n") || "Nobody has any coins yet. Try `/daily`!")
            .setFooter({ text: "Wallet + bank" });

        return ctx.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
}
