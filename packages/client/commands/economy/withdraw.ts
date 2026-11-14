import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { DBManager, Economy } from "../../lib/database";
import { getCurrency, parseAmount } from "../../lib/economy";
import { VortexCommand } from "../../lib/structures/command";

// /withdraw <amount|all>: take coins out of the bank into your wallet.
export class WithdrawCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["with"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("withdraw")
        .setDescription("Take coins out of the bank into your wallet")
        .addStringOption((o) => o.setName("amount").setDescription("A number, \"half\" or \"all\"").setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const [user, currency] = await Promise.all([DBManager.getUser(ctx.user.id), getCurrency(ctx.guildId)]);
        const amount = parseAmount(ctx.options.getString("amount", true), user.bank);

        if (!amount) return ctx.reply({ content: user.bank ? "Give a positive amount, \"half\" or \"all\"." : "Your bank is empty.", ephemeral: true });

        const result = await Economy.moveToBank(ctx.user.id, -amount);
        if (!result) return ctx.reply({ content: `You only have ${currency.format(user.bank)} in the bank.`, ephemeral: true });

        return ctx.reply({ content: `💵 Withdrew ${currency.format(amount)}. Wallet: ${currency.format(result.balance)} · Bank: ${currency.format(result.bank)}` });
    }
}
