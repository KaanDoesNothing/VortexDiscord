import { Command } from "@sapphire/framework";
import { GuildMember, SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { Database } from "../../lib/database";

export class WarnCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {...options,
            requiredUserPermissions: ["ModerateMembers"]
        });
    }
    
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn")
        .addUserOption((arg) => arg.setName("user").setDescription("User").setRequired(true))
        .addStringOption((arg) => arg.setName("reason").setDescription("Reason").setRequired(false));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const member = ctx.options.getMember("user") as GuildMember;
        const reason = ctx.options.getString("reason") || "None";

        await Database.Modlog.create({
            type: "warn",
            server: ctx.guild!.id,
            user: ctx.user.id,
            target: member.user!.id,
            reason
        });

        return ctx.reply({content: `${member.user.tag} has been warned.`});
    }
}