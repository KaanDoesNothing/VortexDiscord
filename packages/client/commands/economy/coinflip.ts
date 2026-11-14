import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { DBManager } from "../../lib/database";
import { ECONOMY, getCurrency } from "../../lib/economy";
import { VortexCommand } from "../../lib/structures/command";

// /coinflip <side> <bet>: 50/50 double-or-nothing.
export class CoinflipCommand extends VortexCommand {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["cf"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("coinflip")
        .setDescription("Bet coins on a coin flip: guess right and double your bet")
        .addStringOption((option) => option.setName("side")
            .setDescription("Heads or tails")
            .addChoices(
                { name: "Heads", value: "heads" }, { name: "Tails", value: "tails" },
                // Short forms for prefix usage, e.g. "->cf h 100".
                { name: "H", value: "heads" }, { name: "T", value: "tails" }
            )
            .setRequired(true))
        .addIntegerOption((option) => option.setName("amount").setDescription("How much to bet").setMinValue(1).setMaxValue(ECONOMY.maxBet).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const side = ctx.options.getString("side", true);
        const amount = ctx.options.getInteger("amount", true);
        const currency = await getCurrency(ctx.guildId);

        const result = Math.random() < 0.5 ? "heads" : "tails";
        const won = result === side;

        // Atomic: only applies if they can cover the bet.
        const balance = await DBManager.adjustBalance(ctx.user.id, won ? amount : -amount, amount);
        if (balance === null) return ctx.reply({ content: `You don't have ${currency.format(amount)} to bet.`, ephemeral: true });

        const outcome = won
            ? `✅ It landed on **${result}**! You won ${currency.format(amount)}.`
            : `❌ It landed on **${result}**. You lost ${currency.format(amount)}.`;

        return ctx.reply({ content: `${outcome}\nWallet: ${currency.format(balance)}` });
    }
}
