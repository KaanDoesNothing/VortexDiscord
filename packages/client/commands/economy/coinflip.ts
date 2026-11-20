import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { ECONOMY, economyFor } from "../../lib/economy";
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
        const eco = await economyFor(ctx.guildId);
        // The server can turn gambling off or cap bets (Dashboard → Economy).
        const betProblem = eco.checkBet(amount);
        if (betProblem) return ctx.reply({ content: betProblem, flags: MessageFlags.Ephemeral });

        const result = Math.random() < 0.5 ? "heads" : "tails";
        const won = result === side;

        // Atomic: only applies if they can cover the bet.
        const balance = await eco.adjust(ctx.user.id, won ? amount : -amount, amount);
        if (balance === null) return ctx.reply({ content: `You don't have ${eco.format(amount)} to bet.`, flags: MessageFlags.Ephemeral });

        const outcome = won
            ? `✅ It landed on **${result}**! You won ${eco.format(amount)}.`
            : `❌ It landed on **${result}**. You lost ${eco.format(amount)}.`;

        return ctx.reply({ content: `${outcome}\nWallet: ${eco.format(balance)}` });
    }
}
