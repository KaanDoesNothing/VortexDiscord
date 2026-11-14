import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { checkModerationTarget } from "../../lib/moderation";
import { logModAction } from "../../lib/modlog";

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
        const member = ctx.guild!.members.cache.get(user.id) ?? null;
        const reason = ctx.options.getString("reason") ?? "None";

        const problem = checkModerationTarget(ctx, member, user);
        if (problem) return ctx.reply({ content: problem, ephemeral: true });
        if (user.bot) return ctx.reply({ content: "Bots can't be warned.", ephemeral: true });

        await logModAction(ctx.guild!, { type: "warn", moderator: ctx.user, target: user, reason });

        // Let them know; it's fine if their DMs are closed.
        const dmSent = await user.send(`You were warned in **${ctx.guild!.name}**. Reason: ${reason}`).then(() => true, () => false);

        return ctx.reply({ content: `${user.tag} has been warned.${dmSent ? "" : " (Couldn't DM them.)"}` });
    }
}
