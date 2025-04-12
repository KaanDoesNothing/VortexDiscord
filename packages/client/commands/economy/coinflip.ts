import {Command} from '@sapphire/framework';
import {SlashCommandBuilder} from "discord.js";
import { VortexCommand } from '../../lib/structures/command';
import { DBManager } from '../../lib/database';
import { CurrencyName } from '../../lib/constant';

export class CoinflipCommand extends VortexCommand {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            aliases: ["cf"]
        });
    }

    public override applicationCommandData = new SlashCommandBuilder().setName("coinflip")
        .setDescription("Flip a coin")
        .addStringOption(option => option.setName("side")
            .setDescription("Heads or tails")
            .addChoices(
                {name: "Heads", value: "heads"}, {name: "Tails", value: "tails"},
                {name: "H", value: "heads"}, {name: "T", value: "tails"}
            ).setRequired(true))
        .addIntegerOption(option => option.setName("amount")
            .setDescription("Amount of coins")
            .setMinValue(1)
            .setRequired(true));

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand(this.applicationCommandData);
    }

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const option = ctx.options.getString("side")!;
        const amount = ctx.options.getInteger("amount")!;

        const userData = await DBManager.getUser(ctx.user.id)

        let generatedNumber = Math.floor(Math.random() * 2) === 0;

        let text = generatedNumber ? "heads" : "tails";

        if (amount > userData.economy!.balance) return ctx.reply({content: `You don't have enough ${CurrencyName}.`});

        const won = text === option;
        const newBalance = won ? userData.economy!.balance + amount : userData.economy!.balance - amount;
        const msgContent = won ? `:white_check_mark: You Won, ${amount} ${CurrencyName} have been added to your bank account.` : `:x: You lost, ${amount} ${CurrencyName} have been taken from your bank account.`;

        userData.economy!.balance = newBalance;
        await userData.save();

        return ctx.reply(msgContent);
    }
}