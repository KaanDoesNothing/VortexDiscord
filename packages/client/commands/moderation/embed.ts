import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /embed <title> <content> [color]: posts a custom embed (announcements, rules, ...).
export class EmbedCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            requiredUserPermissions: ["ManageMessages"],
            runIn: ["GUILD_ANY"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("embed")
        .setDescription("Post a nicely formatted embed, great for announcements and rules")
        .addStringOption((arg) => arg.setName("title").setDescription("The embed's heading").setMaxLength(256).setRequired(true))
        .addStringOption((arg) => arg.setName("content").setDescription("Text (use \\n for new lines)").setMaxLength(4000).setRequired(true))
        .addStringOption((arg) => arg.setName("color").setDescription("Hex color, e.g. #ff8800"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const title = ctx.options.getString("title", true);
        // Slash command inputs can't contain line breaks, so allow a literal "\n".
        const content = ctx.options.getString("content", true).replace(/\\n/g, "\n");
        const color = ctx.options.getString("color");

        const embed = new VortexEmbed().setTitle(title).setDescription(content);

        if (color) {
            if (!/^#?[0-9a-f]{6}$/i.test(color)) return ctx.reply({ content: "Color must be a hex code like #ff8800.", flags: MessageFlags.Ephemeral });
            embed.setColor(parseInt(color.replace("#", ""), 16));
        }

        return ctx.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
}
