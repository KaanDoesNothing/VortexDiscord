import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { auditReason, checkModerationTarget, fetchMember } from "../../lib/moderation";
import { VortexCommand } from "../../lib/structures/command";
import { fail, ok } from "../../lib/structures/embed";

// /nick <member> [nickname]: change or reset a member's nickname.
export class NickCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["nickname"], requiredClientPermissions: ["ManageNicknames"], requiredUserPermissions: ["ManageNicknames"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("nick")
        .setDescription("Change a member's nickname, or reset it")
        .addUserOption((o) => o.setName("member").setDescription("Whose nickname").setRequired(true))
        .addStringOption((o) => o.setName("nickname").setDescription("New nickname (leave empty to reset)").setMaxLength(32));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("member", true);
        const member = await fetchMember(ctx.guild!, user.id);
        if (!member) return ctx.reply(fail(`${user.tag} isn't in this server.`));

        // Changing your own nickname is fine; others follow the usual role rules.
        if (user.id !== ctx.user.id) {
            const problem = checkModerationTarget(ctx, member, user);
            if (problem) return ctx.reply(fail(problem));
        }
        if (!member.manageable) return ctx.reply(fail(`I can't change ${user.tag}'s nickname: their role is above mine.`));

        const nickname = ctx.options.getString("nickname");
        await member.setNickname(nickname, auditReason(ctx.user, nickname ? "Nickname changed" : "Nickname reset"));
        return ctx.reply({ ...ok(nickname ? `${user}'s nickname is now **${nickname}**.` : `Reset ${user}'s nickname.`), allowedMentions: { parse: [] } });
    }
}
