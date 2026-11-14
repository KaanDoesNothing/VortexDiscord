import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { auditReason, checkModerationTarget } from "../../lib/moderation";
import { logModAction } from "../../lib/modlog";

// /undeafen <user> [reason]: reverses /deafen.
export class UndeafenCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            requiredClientPermissions: ["DeafenMembers", "MuteMembers"],
            requiredUserPermissions: ["DeafenMembers"],
            runIn: ["GUILD_ANY"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("undeafen")
        .setDescription("Undo /deafen: let a member hear and speak in voice again")
        .addUserOption((arg) => arg.setName("user").setDescription("Who to undeafen").setRequired(true))
        .addStringOption((arg) => arg.setName("reason").setDescription("Why they're being undeafened").setMaxLength(400));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("user", true);
        const member = ctx.guild!.members.cache.get(user.id) ?? null;
        const reason = ctx.options.getString("reason") ?? "None";

        const problem = checkModerationTarget(ctx, member, user);
        if (problem) return ctx.reply({ content: problem, ephemeral: true });
        if (!member?.voice.channel) return ctx.reply({ content: `${user.tag} isn't in a voice channel.`, ephemeral: true });

        await member.voice.setDeaf(false, auditReason(ctx.user, reason));
        await member.voice.setMute(false, auditReason(ctx.user, reason));
        await logModAction(ctx.guild!, { type: "undeafen", moderator: ctx.user, target: user, reason });

        return ctx.reply({ content: `${user.tag} has been undeafened.` });
    }
}
