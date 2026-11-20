import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { economyFor, parseAmount } from "../../lib/economy";
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
        const eco = await economyFor(ctx.guildId);
        const user = await eco.wallet(ctx.user.id);
        const amount = parseAmount(ctx.options.getString("amount", true), user.bank);

        if (!amount) return ctx.reply({ content: user.bank ? "Give a positive amount, \"half\" or \"all\"." : "Your bank is empty.", flags: MessageFlags.Ephemeral });

        const result = await eco.moveToBank(ctx.user.id, -amount);
        if (!result) return ctx.reply({ content: `You only have ${eco.format(user.bank)} in the bank.`, flags: MessageFlags.Ephemeral });

        return ctx.reply({ content: `💵 Withdrew ${eco.format(amount)}. Wallet: ${eco.format(result.balance)} · Bank: ${eco.format(result.bank)}` });
    }
}
