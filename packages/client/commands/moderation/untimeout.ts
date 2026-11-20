import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { auditReason, fetchMember, moderationReason, REASON_REQUIRED } from "../../lib/moderation";
import { logModAction, notifyTarget } from "../../lib/modlog";
import { fail } from "../../lib/structures/embed";
import { VortexCommand } from "../../lib/structures/command";

// /untimeout <user> [reason]: ends a timeout early.
export class UntimeoutCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            aliases: ["unmute"],
            requiredClientPermissions: ["ModerateMembers"],
            requiredUserPermissions: ["ModerateMembers"],
            runIn: ["GUILD_ANY"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription("End a member's timeout early")
        .addUserOption((o) => o.setName("user").setDescription("Whose timeout to end").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Why").setMaxLength(400));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("user", true);
        const member = await fetchMember(ctx.guild!, user.id);
        const reason = await moderationReason(ctx);
        if (reason === null) return ctx.reply(fail(REASON_REQUIRED));

        if (!member?.isCommunicationDisabled()) return ctx.reply({ content: `${user.tag} isn't timed out.`, flags: MessageFlags.Ephemeral });
        if (!member.moderatable) return ctx.reply({ content: `I can't change ${user.tag}'s timeout: their role is above mine.`, flags: MessageFlags.Ephemeral });

        await member.timeout(null, auditReason(ctx.user, reason));
        await logModAction(ctx.guild!, { type: "untimeout", moderator: ctx.user, target: user, reason });

        return ctx.reply({ content: `${user.tag}'s timeout has been removed.` });
    }
}
