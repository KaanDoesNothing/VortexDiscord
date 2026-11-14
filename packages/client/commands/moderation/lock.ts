import { Command } from "@sapphire/framework";
import { ChannelType, SlashCommandBuilder } from "discord.js";
import { setChannelLocked } from "../../lib/moderation";
import { VortexCommand } from "../../lib/structures/command";

// /lock [channel] [reason]: stops @everyone from sending messages in a channel. /unlock undoes it.
export class LockCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            requiredClientPermissions: ["ManageChannels"],
            requiredUserPermissions: ["ManageChannels"],
            runIn: ["GUILD_ANY"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("lock")
        .setDescription("Stop everyone from sending messages in a channel")
        .addChannelOption((o) => o.setName("channel").setDescription("Which channel (defaults to this one)").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        .addStringOption((o) => o.setName("reason").setDescription("Shown in the channel").setMaxLength(300));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        return setChannelLocked(ctx, true);
    }
}
