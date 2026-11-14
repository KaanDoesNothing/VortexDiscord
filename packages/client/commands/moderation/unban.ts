import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { auditReason } from "../../lib/moderation";
import { logModAction } from "../../lib/modlog";
import { VortexCommand } from "../../lib/structures/command";

// /unban <user_id> [reason]: lifts a ban. Takes an ID because banned users can't be @mentioned.
export class UnbanCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            requiredClientPermissions: ["BanMembers"],
            requiredUserPermissions: ["BanMembers"],
            runIn: ["GUILD_ANY"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Lift a ban (use the user's ID)")
        .addStringOption((o) => o.setName("user_id").setDescription("The banned user's ID").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("Why").setMaxLength(400));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const id = ctx.options.getString("user_id", true).replace(/[<@!>]/g, "").trim();
        const reason = ctx.options.getString("reason") ?? "None";

        const ban = /^\d{15,25}$/.test(id) ? await ctx.guild!.bans.fetch(id).catch(() => null) : null;
        if (!ban) return ctx.reply({ content: "That user isn't banned here (check the ID).", ephemeral: true });

        await ctx.guild!.bans.remove(id, auditReason(ctx.user, reason));
        await logModAction(ctx.guild!, { type: "unban", moderator: ctx.user, target: ban.user, reason });

        return ctx.reply({ content: `${ban.user.tag} has been unbanned.` });
    }
}
