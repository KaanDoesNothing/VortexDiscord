import { ApplicationCommandInteraction } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { nekosLife } from "../../lib/nekosLife.ts";

export default class FactCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "fact",
            description: "Fact"
        }
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const fact = (await nekosLife.fact()).fact;

		ctx.reply(`Did you know that: ${fact}`);
    }
}