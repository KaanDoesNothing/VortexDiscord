import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { fail } from "../../lib/structures/embed";
import { VortexCommand } from "../../lib/structures/command";
import { auditReason, checkModerationTarget, fetchMember, moderationReason, REASON_REQUIRED } from "../../lib/moderation";
import { logModAction, notifyTarget } from "../../lib/modlog";

// /ban <user> [reason] [delete_days]: bans a member, or any user by ID even if they aren't in the server.
export class BanCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            requiredClientPermissions: ["BanMembers"],
            requiredUserPermissions: ["BanMembers"],
            runIn: ["GUILD_ANY"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Ban a user from the server, even if they've already left")
        .addUserOption((arg) => arg.setName("user").setDescription("Who to ban").setRequired(true))
        .addStringOption((arg) => arg.setName("reason").setDescription("Why they're being banned (shown in the mod log and audit log)").setMaxLength(400))
        .addIntegerOption((arg) => arg.setName("delete_days").setDescription("Delete their messages from the last N days (0-7)").setMinValue(0).setMaxValue(7));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("user", true);
        const member = await fetchMember(ctx.guild!, user.id);
        const reason = await moderationReason(ctx);
        if (reason === null) return ctx.reply(fail(REASON_REQUIRED));
        const deleteDays = ctx.options.getInteger("delete_days") ?? 0;

        const problem = checkModerationTarget(ctx, member, user);
        if (problem) return ctx.reply({ content: problem, flags: MessageFlags.Ephemeral });

        // The bot's role must be above theirs.
        if (member && !member.bannable) return ctx.reply({ content: `I can't ban ${user.tag}: their role is above mine.`, flags: MessageFlags.Ephemeral });

        // The DM (and appeal message) has to go out before the ban.
        await notifyTarget(ctx.guild!, { type: "ban", moderator: ctx.user, target: user, reason });

        await ctx.guild!.bans.create(user.id, {
            reason: auditReason(ctx.user, reason),
            deleteMessageSeconds: deleteDays * 86_400
        });

        await logModAction(ctx.guild!, { type: "ban", moderator: ctx.user, target: user, reason });

        return ctx.reply({ content: `${user.tag} has been banned.` });
    }
}
