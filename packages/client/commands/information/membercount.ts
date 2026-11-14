import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /membercount: members, humans/bots and how many are online (estimated by Discord).
export class MemberCountCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["members"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("membercount")
        .setDescription("How many members this server has, and how many are online");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        // withCounts gives Discord's approximate totals without needing the members intent.
        const guild = await ctx.guild!.fetch();
        const bots = ctx.guild!.members.cache.filter((m) => m.user.bot).size;

        const embed = new VortexEmbed()
            .setTitle(`👥 ${guild.name}`)
            .setThumbnail(guild.iconURL())
            .addField("Members", (guild.approximateMemberCount ?? guild.memberCount).toLocaleString(), true)
            .addField("Online", guild.approximatePresenceCount?.toLocaleString() ?? "?", true);

        if (bots) embed.addField("Bots (cached)", bots.toLocaleString(), true);
        return ctx.reply({ embeds: [embed] });
    }
}
