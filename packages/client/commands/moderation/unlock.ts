import { Command } from "@sapphire/framework";
import { ChannelType, SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { setChannelLocked } from "../../lib/moderation";

// /unlock [channel]: reverses /lock.
export class UnlockCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            requiredClientPermissions: ["ManageChannels"],
            requiredUserPermissions: ["ManageChannels"],
            runIn: ["GUILD_ANY"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("unlock")
        .setDescription("Let everyone send messages in a locked channel again")
        .addChannelOption((o) => o.setName("channel").setDescription("Which channel (defaults to this one)").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        return setChannelLocked(ctx, false);
    }
}
