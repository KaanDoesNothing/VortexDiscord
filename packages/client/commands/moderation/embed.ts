import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

export class EmbedCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {...options,
            requiredUserPermissions: ["ManageMessages"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Embed")
        .addStringOption((arg) => arg.setName("title").setDescription("Title").setRequired(true))
        .addStringOption((arg) => arg.setName("content").setDescription("Content").setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const title = ctx.options.getString("title")!;
        const content = ctx.options.getString("content")!;

        const embed = new VortexEmbed()
            .setTitle(title)
            .setDescription(content);

        return ctx.reply({embeds: [embed]});
    }
}