import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { DBManager } from "../../lib/database";
import { VortexCommand } from "../../lib/structures/command";

// /prefix <prefix>: changes the text-command prefix for this server (also editable in the dashboard).
export class PrefixCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            requiredUserPermissions: ["ManageGuild"],
            runIn: ["GUILD_ANY"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("prefix")
        .setDescription("Change the prefix for text commands on this server")
        .addStringOption((arg) => arg.setName("prefix").setDescription("The new prefix, e.g. ! or ?? (max 10 characters)").setMaxLength(10).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const prefix = ctx.options.getString("prefix", true).trim();
        if (!prefix || prefix.length > 10) return ctx.reply({ content: "The prefix must be 1 to 10 characters.", ephemeral: true });

        await DBManager.setPrefix(ctx.guild!.id, prefix);

        return ctx.reply({ content: `The prefix is now \`${prefix}\`. Try \`${prefix}help\`.` });
    }
}
