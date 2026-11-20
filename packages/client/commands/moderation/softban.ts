import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { auditReason, checkModerationTarget, fetchMember, moderationReason, REASON_REQUIRED } from "../../lib/moderation";
import { logModAction, notifyTarget } from "../../lib/modlog";
import { VortexCommand } from "../../lib/structures/command";
import { fail, ok } from "../../lib/structures/embed";

// /softban <user> [reason] [delete_days]: ban and immediately unban, which kicks the member and
// deletes their recent messages (good for cleaning up spam bots). They can rejoin with an invite.
export class SoftbanCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, requiredClientPermissions: ["BanMembers"], requiredUserPermissions: ["BanMembers"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("softban")
        .setDescription("Kick a member and delete their recent messages (ban + instant unban)")
        .addUserOption((o) => o.setName("user").setDescription("Who to softban").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Why").setMaxLength(400))
        .addIntegerOption((o) => o.setName("delete_days").setDescription("Delete their messages from the last N days (default 1)").setMinValue(1).setMaxValue(7));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("user", true);
        const member = await fetchMember(ctx.guild!, user.id);
        const reason = await moderationReason(ctx);
        if (reason === null) return ctx.reply(fail(REASON_REQUIRED));

        const problem = checkModerationTarget(ctx, member, user);
        if (problem) return ctx.reply(fail(problem));
        if (member && !member.bannable) return ctx.reply(fail(`I can't ban ${user.tag}: their role is above mine.`));

        await notifyTarget(ctx.guild!, { type: "softban", moderator: ctx.user, target: user, reason });
        await ctx.guild!.bans.create(user.id, { reason: auditReason(ctx.user, `Softban: ${reason}`), deleteMessageSeconds: (ctx.options.getInteger("delete_days") ?? 1) * 86_400 });
        await ctx.guild!.bans.remove(user.id, "Softban (unban)").catch(() => null);
        await logModAction(ctx.guild!, { type: "softban", moderator: ctx.user, target: user, reason });

        return ctx.reply(ok(`${user.tag} was softbanned: kicked and their recent messages deleted.`));
    }
}
