import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { economyFor, parseAmount } from "../../lib/economy";
import { VortexCommand } from "../../lib/structures/command";

// /deposit <amount|all>: move coins from your wallet to the bank, where /rob can't reach them.
export class DepositCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["dep"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("deposit")
        .setDescription("Put coins in the bank, safe from /rob")
        .addStringOption((o) => o.setName("amount").setDescription("A number, \"half\" or \"all\"").setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const eco = await economyFor(ctx.guildId);
        const user = await eco.wallet(ctx.user.id);
        const amount = parseAmount(ctx.options.getString("amount", true), user.balance);

        if (!amount) return ctx.reply({ content: user.balance ? "Give a positive amount, \"half\" or \"all\"." : "Your wallet is empty.", flags: MessageFlags.Ephemeral });

        const result = await eco.moveToBank(ctx.user.id, amount);
        if (!result) return ctx.reply({ content: `You only have ${eco.format(user.balance)} in your wallet.`, flags: MessageFlags.Ephemeral });

        return ctx.reply({ content: `🏦 Deposited ${eco.format(amount)}. Wallet: ${eco.format(result.balance)} · Bank: ${eco.format(result.bank)}` });
    }
}
