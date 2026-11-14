import { Command } from "@sapphire/framework";
import { GuildMember, SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { Database } from "../../lib/database";

export class UndeafenCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {...options,
            requiredClientPermissions: ["DeafenMembers"],
            requiredUserPermissions: ["DeafenMembers"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("undeafen")
        .setDescription("Undeafen a member")
        .addUserOption((arg) => arg.setName("user").setDescription("User").setRequired(true))
        .addStringOption((arg) => arg.setName("reason").setDescription("Reason").setRequired(false));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const member = ctx.options.getMember("user") as GuildMember;
        const reason = ctx.options.getString("reason") || "None";

        await member.voice.setDeaf(false);
        await member.voice.setMute(false);

        await Database.Modlog.create({
            type: "undeafen",
            server: ctx.guild!.id,
            user: ctx.user.id,
            target: member.user.id,
            reason
        })

        return ctx.reply({content: `${member.user.tag} has been undeafened.`});
    }
}