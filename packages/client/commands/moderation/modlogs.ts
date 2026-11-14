import { Command } from "@sapphire/framework";
import { GuildMember, SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { Database } from "../../lib/database";
import { VortexEmbed } from "../../lib/structures/embed";

export class ModLogsCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {...options,
            requiredUserPermissions: ["ModerateMembers"]
        });
    }
    
    public override applicationCommandData = new SlashCommandBuilder()
    .setName("modlogs")
    .setDescription("Modlogs")
    .addUserOption((arg) => arg.setName("user").setDescription("User").setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const member = ctx.options.getMember("user") as GuildMember;

        const warnList = await Database.Modlog.find({server: ctx.guild!.id, target: member.user.id}).sort({createdAt: -1}).limit(10);

        const embed = new VortexEmbed()
            .setTitle(`${member.user.tag}'s modlogs`);

        for (const i in warnList) {
            const row = warnList[i]!;

            embed.addField(row.type, `${row.createdAt.toLocaleString()}: ${row.reason}`);
        }

        return ctx.reply({embeds: [embed]});
    }
}