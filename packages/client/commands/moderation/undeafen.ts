import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { fail } from "../../lib/structures/embed";
import { VortexCommand } from "../../lib/structures/command";
import { auditReason, checkModerationTarget, fetchMember, moderationReason, REASON_REQUIRED } from "../../lib/moderation";
import { logModAction, notifyTarget } from "../../lib/modlog";

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
        const member = await fetchMember(ctx.guild!, user.id);
        const reason = await moderationReason(ctx);
        if (reason === null) return ctx.reply(fail(REASON_REQUIRED));

        const problem = checkModerationTarget(ctx, member, user);
        if (problem) return ctx.reply({ content: problem, flags: MessageFlags.Ephemeral });
        if (!member?.voice.channel) return ctx.reply({ content: `${user.tag} isn't in a voice channel.`, flags: MessageFlags.Ephemeral });

        await member.voice.setDeaf(false, auditReason(ctx.user, reason));
        await member.voice.setMute(false, auditReason(ctx.user, reason));
        await logModAction(ctx.guild!, { type: "undeafen", moderator: ctx.user, target: user, reason });

        return ctx.reply({ content: `${user.tag} has been undeafened.` });
    }
}
