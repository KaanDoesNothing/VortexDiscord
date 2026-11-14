import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { CalcError, evaluate, formatResult } from "../../lib/calc";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /calc <expression>: a safe calculator (see lib/calc.ts for what's supported).
export class CalcCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["calculate", "math"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("calc")
        .setDescription("Calculate a math expression, e.g. (2+3)*4, sqrt(16), 2^10, sin(pi/2)")
        .addStringOption((o) => o.setName("expression").setDescription("What to calculate").setMaxLength(300).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const expression = ctx.options.getString("expression", true);

        try {
            const result = evaluate(expression);
            const embed = new VortexEmbed()
                .setTitle("🧮 Calculator")
                .addField("Expression", `\`\`\`${expression.replace(/`/g, "")}\`\`\``)
                .addField("Result", `\`\`\`${formatResult(result)}\`\`\``);
            return ctx.reply({ embeds: [embed] });
        } catch (error) {
            const reason = error instanceof CalcError ? error.message : "Couldn't calculate that";
            return ctx.reply({ content: `❌ ${reason}. Supported: + - * / % ^, parentheses, pi, e, sqrt, abs, round, sin, cos, tan, log, ln, min, max…`, ephemeral: true });
        }
    }
}
