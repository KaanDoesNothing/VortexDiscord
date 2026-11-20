import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { invitedBy, inviteLeaderboard, inviteStats } from "../../lib/invites";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

const MEDALS = ["🥇", "🥈", "🥉"];

// /invites [member] and /invites top: how many people someone brought to the server.
// Tracking starts once the bot has Manage Server; joins before that aren't known.
export class InvitesCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("invites")
        .setDescription("See how many members someone has invited, or the top inviters")
        .addSubcommand((s) => s.setName("user").setDescription("Someone's invite count")
            .addUserOption((o) => o.setName("member").setDescription("Whose invites (defaults to you)")))
        .addSubcommand((s) => s.setName("top").setDescription("Members who brought the most people that stayed"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guildId = ctx.guildId!;

        if (ctx.options.getSubcommand() === "top") {
            const rows = await inviteLeaderboard(guildId, 10);
            const embed = new VortexEmbed().setTitle(`📨 Top inviters in ${ctx.guild!.name}`)
                .setDescription(rows.map((r, i) => `${MEDALS[i] ?? `\`#${i + 1}\``} <@${r.inviterId}> · **${r.current}** member${r.current === 1 ? "" : "s"}`).join("\n") || "No tracked invites yet.")
                .setFooter({ text: "Counts members who are still here" });
            return ctx.reply({ embeds: [embed], allowedMentions: { parse: [] } });
        }

        const user = ctx.options.getUser("member") ?? ctx.user;
        const [stats, joined] = await Promise.all([inviteStats(guildId, user.id), invitedBy(guildId, user.id)]);
        const embed = new VortexEmbed()
            .setAuthor({ name: `${user.displayName}'s invites`, iconURL: user.displayAvatarURL() })
            .addField("Still here", stats.current.toLocaleString("en-US"), true)
            .addField("Left", stats.left.toLocaleString("en-US"), true)
            .addField("Total", stats.total.toLocaleString("en-US"), true);
        if (joined) embed.addField("Invited by", joined.inviterId ? `<@${joined.inviterId}>${joined.code ? ` (\`${joined.code}\`)` : ""}` : "Unknown");
        return ctx.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
}
