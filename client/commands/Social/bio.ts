import { ApplicationCommandInteraction, ApplicationCommandOptionType, MessageAttachment, User } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { UserTable } from "../../lib/Database.ts";
import { CurrencyName, NoUserDBEntry } from "../../lib/Language.ts";

export default class BioCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "bio",
            description: "Change your bio",
            options: [
                {
                    name: "input",
                    required: true,
                    description: "Bio",
                    type: ApplicationCommandOptionType.STRING
                }
            ]
        }
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const input = ctx.option("input") as string;

        const userData = await UserTable.findOne({user_id: ctx.user.id});
        if(!userData) return;

        userData.set("profile.description", input);

        await userData.save();

        ctx.reply("Your bio has been updated!");
    }
}