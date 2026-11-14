import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { DBManager, Economy } from "../../lib/database";
import { getCurrency, parseAmount } from "../../lib/economy";
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
        const [user, currency] = await Promise.all([DBManager.getUser(ctx.user.id), getCurrency(ctx.guildId)]);
        const amount = parseAmount(ctx.options.getString("amount", true), user.balance);

        if (!amount) return ctx.reply({ content: user.balance ? "Give a positive amount, \"half\" or \"all\"." : "Your wallet is empty.", ephemeral: true });

        const result = await Economy.moveToBank(ctx.user.id, amount);
        if (!result) return ctx.reply({ content: `You only have ${currency.format(user.balance)} in your wallet.`, ephemeral: true });

        return ctx.reply({ content: `🏦 Deposited ${currency.format(amount)}. Wallet: ${currency.format(result.balance)} · Bank: ${currency.format(result.bank)}` });
    }
}
