import { ApplicationCommandInteraction, ApplicationCommandOptionType } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";

export class EightBallCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "8ball",
            description: "Hmmm",
            options: [
                {
                    name: "question",
                    required: true,
                    description: "Question",
                    type: ApplicationCommandOptionType.STRING
                }
            ]
        }

        this.category = "Fun";
    }

    exec(ctx: ApplicationCommandInteraction): void {
        const replies = ["Yes", "No", "I didn't get that, please ask again", "Ask me later", "Of Course", "Absolutely not"]

		const result = Math.floor((Math.random() * replies.length));

		ctx.reply(replies[result]);
    }
}