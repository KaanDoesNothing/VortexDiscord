import { ApplicationCommandInteraction, ApplicationCommandOptionType, User } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { UserTable } from "../../lib/Database.ts";
import { CurrencyName } from "../../lib/Language.ts";

export default class CoinFlipCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "coinflip",
            description: "Flip a coin",
            options: [
                {
                    name: "side",
                    required: true,
                    choices: [
                        {
                            name: "Heads",
                            value: "heads"
                        },
                        {
                            name: "Tails",
                            value: "tails",
                        }
                    ],
                    description: "Heads or Tails",
                    type: ApplicationCommandOptionType.STRING
                },
                {
                    name: "amount",
                    description: "How much do you want to bet?",
                    required: true,
                    type: ApplicationCommandOptionType.NUMBER
                }
            ]
        }
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const flip = ctx.option("side") as string;
        const amount = ctx.option("amount") as number;

        if(!flip || !amount) return;

        const userData = await UserTable.findOne({user_id: ctx.user.id});

        if(!userData) return;

        const generatedNumber = Math.floor(Math.random() * 2) === 0;

        const text = generatedNumber ? "heads" : "tails";

        let msgContent;

        if(text !== flip) {
            userData.economy.money.value -= amount;

            msgContent = `:x: You lost, ${amount} ${CurrencyName} have been taken from your bank account.`;
        }else {
            userData.economy.money.value += amount;

            msgContent = `:white_check_mark: You Won, ${amount} ${CurrencyName} have been added to your bank account.`;
        }

        await userData.save();

        ctx.reply(msgContent);
	}
}