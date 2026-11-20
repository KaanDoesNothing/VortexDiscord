import { Command } from "@sapphire/framework";
import { ChannelType, SlashCommandBuilder, type GuildTextBasedChannel } from "discord.js";
import { DBManager } from "../../lib/database";
import { renderVerifyPanel } from "../../lib/verification";
import { VortexCommand } from "../../lib/structures/command";
import { fail, ok } from "../../lib/structures/embed";

// /verify panel [channel]: posts the verification panel (button or captcha, per the dashboard settings).
export class VerifyCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, requiredUserPermissions: ["ManageGuild"], requiredClientPermissions: ["ManageRoles"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("verify")
        .setDescription("Post the verification panel new members use to get access (admins)")
        .addSubcommand((s) => s.setName("panel").setDescription("Post the Verify button in a channel")
            .addChannelOption((o) => o.setName("channel").setDescription("Where to post it (defaults to here)").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const { settings } = await DBManager.getGuildConfig(ctx.guildId!);
        const rules = settings.verification;
        if (!rules.enabled || !rules.roleId) {
            return ctx.reply(fail("Turn verification on and pick the verified role in the dashboard first (Moderation → Verification)."));
        }

        const channel = (ctx.options.getChannel("channel") ?? ctx.channel) as GuildTextBasedChannel | null;
        if (!channel?.isSendable()) return ctx.reply(fail("I can't post in that channel."));

        await channel.send(renderVerifyPanel(rules, ctx.guildId!));
        return ctx.reply(ok(`Verification panel posted in ${channel}.`, true));
    }
}
