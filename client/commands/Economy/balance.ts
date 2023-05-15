import { ApplicationCommandInteraction, ApplicationCommandOptionType, User } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { UserTable } from "../../lib/Database.ts";
import { CurrencyName, NoUserDBEntry } from "../../lib/Language.ts";

export class BalanceCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "balance",
            description: "Balance",
            options: [
                {
                    name: "user",
                    required: false,
                    description: "User",
                    type: ApplicationCommandOptionType.USER
                }
            ]
        }

        this.category = "Economy";
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const user: User = ctx.option("user") || ctx.user;

        const userData = await UserTable.findOne({user_id: user.id});

        if(!userData) {
            ctx.reply(NoUserDBEntry);
            return;
        }

       ctx.reply(`${user.id === ctx.user.id ? "You have" : `${user.tag} has`} ${userData.economy.money.value} ${CurrencyName}.`);
    }
}