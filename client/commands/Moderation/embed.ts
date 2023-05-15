import { ApplicationCommandInteraction, ApplicationCommandOptionType } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { VortexEmbed } from "../../lib/Embed.ts";

export class EmbedCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "embed",
            description: "Send an embed",
            options: [
                {
                    name: "title",
                    required: true,
                    description: "Title",
                    type: ApplicationCommandOptionType.STRING
                },
                {
                    name: "content",
                    required: true,
                    description: "Content",
                    type: ApplicationCommandOptionType.STRING
                }
            ]
        }

        this.category = "Moderation";

        this.userPermissions.push("MANAGE_MESSAGES");
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const title = ctx.option("title") as string;
        const content = ctx.option("content") as string || "None";
        
        const embed = new VortexEmbed()
            .setTitle(title)
            .setDescription(content);

        ctx.reply({embeds: [embed]});
    }
}