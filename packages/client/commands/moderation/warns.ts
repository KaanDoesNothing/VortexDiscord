import { Command } from "@sapphire/framework";
import { GuildMember, SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { Database } from "../../lib/database";
import { VortexEmbed } from "../../lib/structures/embed";

export class WarningsCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {...options,
            requiredUserPermissions: ["ModerateMembers"]
        });
    }
    
    public override applicationCommandData = new SlashCommandBuilder()
    .setName("warns")
    .setDescription("Warns")
    .addUserOption((arg) => arg.setName("user").setDescription("User").setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const member = ctx.options.getMember("user") as GuildMember;

        const warnList = await Database.Modlog.find({server: ctx.guild!.id, target: member.user.id, type: "warn"});

        const embed = new VortexEmbed()
            .setTitle(`${member.user.tag}'s warnings`);

        for (const i in warnList) {
            const row = warnList[i]!;

            embed.addField(row.createdAt.toLocaleString(), row.reason);
        }

        return ctx.reply({embeds: [embed]});
    }
}