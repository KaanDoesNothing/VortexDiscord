import { ApplicationCommandInteraction, ApplicationCommandOptionType, User } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { UserTable } from "../../lib/Database.ts";
import { CurrencyName, NoUserDBEntry } from "../../lib/Language.ts";

export default class PayCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "pay",
            description: "Pay someone",
            options: [
                {
                    name: "user",
                    required: true,
                    description: "User",
                    type: ApplicationCommandOptionType.USER
                },
                {
                    name: "amount",
                    required: true,
                    description: "Amount",
                    type: ApplicationCommandOptionType.NUMBER
                }
            ]
        }
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const user: User = ctx.option("user");
        const amount = ctx.option("amount") as number;

        if(user.id === ctx.user.id) {
            ctx.reply("Nice try!");
            return;
        }

        const userData = await UserTable.findOne({user_id: ctx.user.id});
        const targetData = await UserTable.findOne({user_id: user.id});

        if(!targetData || !userData) {
            ctx.reply(NoUserDBEntry);
            return;
        }

        if(amount > userData.economy.money.value) {
            ctx.reply(`You don't have enough ${CurrencyName}`);
            return;
        } 

        userData.economy.money.value -= amount;
        targetData.economy.money.value += amount;

       await userData.save();
       await targetData.save();

       ctx.reply(`${amount} has been removed from your balance and has been given to ${user.tag}.`);
       return;
    }
}