import { ApplicationCommandInteraction, ApplicationCommandOptionType, User } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";

export default class PurgeCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "purge",
            description: "Delete messages",
            options: [
                {
                    name: "amount",
                    required: true,
                    description: "Amount",
                    type: ApplicationCommandOptionType.NUMBER
                }
            ]
        }

        // this.clientPermissions.push("MANAGE_MESSAGES");
        this.userPermissions.push("MANAGE_MESSAGES");
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const amount = ctx.option("amount") as number;
        
        const messages = await ctx.channel?.fetchMessages({limit: amount + 1});
        if(!messages) return;

        messages.forEach(msg => msg.delete());

        const temp = await ctx.reply(`Purged ${amount} messages.`);

        setTimeout(() => {
            temp.deleteResponse();
        }, 2000);
    }
}