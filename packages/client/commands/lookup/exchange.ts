import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { apiErrorMessage, getJson } from "../../lib/http";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

interface Rates { amount: number; base: string; date: string; rates: Record<string, number> }

// /exchange <amount> <from> <to>: real-world currency conversion with daily ECB rates (Frankfurter).
export class ExchangeCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["convert", "fx"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("exchange")
        .setDescription("Convert between real-world currencies, e.g. 100 USD to EUR")
        .addNumberOption((o) => o.setName("amount").setDescription("How much").setMinValue(0).setRequired(true))
        .addStringOption((o) => o.setName("from").setDescription("Currency code, e.g. USD").setMinLength(3).setMaxLength(3).setRequired(true))
        .addStringOption((o) => o.setName("to").setDescription("Currency code, e.g. EUR").setMinLength(3).setMaxLength(3).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const amount = ctx.options.getNumber("amount", true);
        const from = ctx.options.getString("from", true).toUpperCase();
        const to = ctx.options.getString("to", true).toUpperCase();
        await ctx.deferReply();

        try {
            if (from === to) return ctx.editReply(`${amount} ${from} is… ${amount} ${to}. 😄`);
            const data = await getJson<Rates>(`https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`, { cacheMs: 3_600_000 });
            const rate = data.rates[to];
            if (!rate) return ctx.editReply(`Unknown currency "${to}". Use 3-letter codes like USD, EUR, GBP, JPY.`);

            const fmt = (n: number, c: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(n);
            const embed = new VortexEmbed()
                .setTitle("💱 Currency conversion")
                .setDescription(`## ${fmt(amount, from)} = ${fmt(amount * rate, to)}`)
                .addField("Rate", `1 ${from} = ${rate.toFixed(4)} ${to}`, true)
                .addField("Inverse", `1 ${to} = ${(1 / rate).toFixed(4)} ${from}`, true)
                .setFooter({ text: `ECB reference rate from ${data.date}` });

            return ctx.editReply({ embeds: [embed] });
        } catch (error) {
            return ctx.editReply(apiErrorMessage(error).replace("Nothing found.", `Unknown currency "${from}".`));
        }
    }
}
