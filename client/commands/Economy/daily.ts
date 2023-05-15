import { ApplicationCommandInteraction, User } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { UserTable } from "../../lib/Database.ts";
import { DailyEconomyCooldown, DailyEconomyReward } from "../../lib/Constant.ts";

export class DailyCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "daily",
            description: "Collect your daily reward",
        }

        this.category = "Economy";
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const user: User = ctx.option("user") || ctx.user;

        const userData = await UserTable.findOne({user_id: user.id});

        if(!userData) return;

        if((Date.now() - userData.economy.money.cooldown) > DailyEconomyCooldown) {
                userData.economy.money.cooldown = Date.now();
                userData.economy.money.value += DailyEconomyReward;

                await userData.save();

                ctx.reply("You've collected your daily!");
        }else {
                ctx.reply({content: "You've already collected your daily!"});
        }
    }
}