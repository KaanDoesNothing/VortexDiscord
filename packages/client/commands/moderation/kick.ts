import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { fail } from "../../lib/structures/embed";
import { VortexCommand } from "../../lib/structures/command";
import { auditReason, checkModerationTarget, fetchMember, moderationReason, REASON_REQUIRED } from "../../lib/moderation";
import { logModAction, notifyTarget } from "../../lib/modlog";

// /kick <user> [reason]
export class KickCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            requiredClientPermissions: ["KickMembers"],
            requiredUserPermissions: ["KickMembers"],
            runIn: ["GUILD_ANY"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Remove a member from the server (they can rejoin with an invite)")
        .addUserOption((arg) => arg.setName("user").setDescription("Who to kick").setRequired(true))
        .addStringOption((arg) => arg.setName("reason").setDescription("Why they're being kicked (shown in the mod log and audit log)").setMaxLength(400));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("user", true);
        const member = await fetchMember(ctx.guild!, user.id);
        const reason = await moderationReason(ctx);
        if (reason === null) return ctx.reply(fail(REASON_REQUIRED));

        const problem = checkModerationTarget(ctx, member, user);
        if (problem) return ctx.reply({ content: problem, flags: MessageFlags.Ephemeral });
        if (!member) return ctx.reply({ content: `${user.tag} isn't in this server.`, flags: MessageFlags.Ephemeral });
        if (!member.kickable) return ctx.reply({ content: `I can't kick ${user.tag}: their role is above mine.`, flags: MessageFlags.Ephemeral });

        await notifyTarget(ctx.guild!, { type: "kick", moderator: ctx.user, target: user, reason });
        await member.kick(auditReason(ctx.user, reason));
        await logModAction(ctx.guild!, { type: "kick", moderator: ctx.user, target: user, reason });

        return ctx.reply({ content: `${user.tag} has been kicked.` });
    }
}
