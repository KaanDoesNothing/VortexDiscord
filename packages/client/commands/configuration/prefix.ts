import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { DBManager } from "../../lib/database";

export class PrefixCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {...options,
            requiredUserPermissions: ["Administrator"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("prefix")
        .setDescription("Change the server prefix")
        .addStringOption((arg) => arg.setName("prefix").setDescription("Prefix").setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const prefix = ctx.options.getString("prefix")!;

        const guildData = await DBManager.getGuild(ctx.guild!.id);
        guildData.prefix = prefix;
        await guildData.save();

        return ctx.reply({content: "Server prefix has been updated."});
    }
}