import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { pick } from "../../lib/economy";
import { VortexCommand } from "../../lib/structures/command";

// /choose <options>: picks one of several options separated by "|" or ",".
export class ChooseCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["pick", "decide"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("choose")
        .setDescription("Can't decide? Let the bot pick one of your options")
        .addStringOption((o) => o.setName("options").setDescription("Choices separated by | or , e.g. pizza | sushi | tacos").setMaxLength(1000).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const raw = ctx.options.getString("options", true);
        const options = raw.split(raw.includes("|") ? "|" : ",").map((o) => o.trim()).filter(Boolean);
        if (options.length < 2) return ctx.reply({ content: "Give at least two options, separated by `|` or `,`.", ephemeral: true });

        return ctx.reply({ content: `🤔 I choose… **${pick(options)}**!`, allowedMentions: { parse: [] } });
    }
}
