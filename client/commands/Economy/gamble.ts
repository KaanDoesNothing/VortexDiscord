import { ApplicationCommandInteraction, ApplicationCommandOptionType } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { UserTable } from "../../lib/Database.ts";
import { CurrencyName } from "../../lib/Language.ts";

export class GambleCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "gamble",
            description: `Gamble some of your ${CurrencyName}`,
            options: [
                {
                    name: "amount",
                    description: "How much do you want to bet?",
                    required: true,
                    type: ApplicationCommandOptionType.NUMBER
                }
            ]
        }
        
        this.category = "Economy";
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const amount = ctx.option("amount") as number;

        const userData = await UserTable.findOne({user_id: ctx.user.id});

        if(!userData) return;

        const won = Math.floor(Math.random() * 2) === 0;

        let msgContent;

        if(!won) {
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