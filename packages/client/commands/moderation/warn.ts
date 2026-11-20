import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { fail } from "../../lib/structures/embed";
import { VortexCommand } from "../../lib/structures/command";
import { checkModerationTarget, fetchMember, moderationReason, REASON_REQUIRED } from "../../lib/moderation";
import { logModAction, notifyTarget } from "../../lib/modlog";

// /warn <user> [reason]: records a warning (see /warns) and DMs the user about it.
export class WarnCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            requiredUserPermissions: ["ModerateMembers"],
            runIn: ["GUILD_ANY"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Give a member a formal warning; they get a DM and it's saved to their record")
        .addUserOption((arg) => arg.setName("user").setDescription("Who to warn").setRequired(true))
        .addStringOption((arg) => arg.setName("reason").setDescription("What the warning is for").setMaxLength(400));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("user", true);
        const member = await fetchMember(ctx.guild!, user.id);
        const reason = await moderationReason(ctx);
        if (reason === null) return ctx.reply(fail(REASON_REQUIRED));

        const problem = checkModerationTarget(ctx, member, user);
        if (problem) return ctx.reply({ content: problem, flags: MessageFlags.Ephemeral });
        if (user.bot) return ctx.reply({ content: "Bots can't be warned.", flags: MessageFlags.Ephemeral });

        await logModAction(ctx.guild!, { type: "warn", moderator: ctx.user, target: user, reason });

        // Let them know (if the server has moderation DMs on); it's fine if their DMs are closed.
        const dmSent = await notifyTarget(ctx.guild!, { type: "warn", moderator: ctx.user, target: user, reason });

        return ctx.reply({ content: `${user.tag} has been warned.${dmSent ? "" : " (Couldn't DM them.)"}` });
    }
}
