import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { DBManager } from "../../lib/database";
import { getCurrency } from "../../lib/economy";
import { VortexCommand } from "../../lib/structures/command";

// /pay <member> <amount>: give coins from your wallet to someone. Atomic (see DBManager.transfer).
export class PayCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["give"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("pay")
        .setDescription("Send coins from your wallet to another member")
        .addUserOption((option) => option.setName("member").setDescription("Who to pay").setRequired(true))
        .addIntegerOption((option) => option.setName("amount").setDescription("How much to send").setMinValue(1).setRequired(true));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const target = ctx.options.getUser("member", true);
        const amount = ctx.options.getInteger("amount", true);
        const currency = await getCurrency(ctx.guildId);

        if (target.id === ctx.user.id) return ctx.reply({ content: "Nice try.", ephemeral: true });
        if (target.bot) return ctx.reply({ content: "Bots can't receive coins.", ephemeral: true });

        const paid = await DBManager.transfer(ctx.user.id, target.id, amount);
        if (!paid) return ctx.reply({ content: `You don't have ${currency.format(amount)} in your wallet.`, ephemeral: true });

        return ctx.reply({ content: `💸 You sent ${currency.format(amount)} to ${target}.`, allowedMentions: { users: [target.id] } });
    }
}
