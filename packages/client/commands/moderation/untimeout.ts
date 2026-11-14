import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { auditReason } from "../../lib/moderation";
import { logModAction } from "../../lib/modlog";
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
        const member = ctx.guild!.members.cache.get(user.id);
        const reason = ctx.options.getString("reason") ?? "None";

        if (!member?.isCommunicationDisabled()) return ctx.reply({ content: `${user.tag} isn't timed out.`, ephemeral: true });
        if (!member.moderatable) return ctx.reply({ content: `I can't change ${user.tag}'s timeout: their role is above mine.`, ephemeral: true });

        await member.timeout(null, auditReason(ctx.user, reason));
        await logModAction(ctx.guild!, { type: "untimeout", moderator: ctx.user, target: user, reason });

        return ctx.reply({ content: `${user.tag}'s timeout has been removed.` });
    }
}
