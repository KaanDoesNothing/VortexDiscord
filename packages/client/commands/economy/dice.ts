import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { DBManager } from "../../lib/database";
import { ECONOMY, getCurrency } from "../../lib/economy";
import { VortexCommand } from "../../lib/structures/command";

// Winnings on a correct guess, as a multiple of the bet. 5x profit on 1-in-6 odds is a fair game;
// anything higher would let players farm coins just by rolling.
const PAYOUT_MULTIPLIER = 5;

// /dice <roll> <amount>: guess the roll of a six-sided die.
export class DiceCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("dice")
        .setDescription(`Guess the dice roll: get it right and win ${PAYOUT_MULTIPLIER}x your bet`)
        .addIntegerOption((option) => option.setName("roll").setDescription("Your guess (1-6)").setMinValue(1).setMaxValue(6).setRequired(true))
        .addIntegerOption((option) => option.setName("amount").setDescription("How much to bet").setMinValue(1).setMaxValue(ECONOMY.maxBet).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guess = ctx.options.getInteger("roll", true);
        const amount = ctx.options.getInteger("amount", true);
        const currency = await getCurrency(ctx.guildId);

        const rolled = Math.floor(Math.random() * 6) + 1;
        const won = guess === rolled;
        const winnings = amount * PAYOUT_MULTIPLIER;

        // Atomic: only applies if they can cover the bet.
        const balance = await DBManager.adjustBalance(ctx.user.id, won ? winnings : -amount, amount);
        if (balance === null) return ctx.reply({ content: `You don't have ${currency.format(amount)} to bet.`, ephemeral: true });

        const outcome = won
            ? `🎲 Rolled a **${rolled}**! You won ${currency.format(winnings)}.`
            : `🎲 Rolled a **${rolled}**. You lost ${currency.format(amount)}.`;

        return ctx.reply({ content: `${outcome}\nWallet: ${currency.format(balance)}` });
    }
}
