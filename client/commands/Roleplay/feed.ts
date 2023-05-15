import { ApplicationCommandInteraction, ApplicationCommandOptionType, User } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { VortexRolePlayEmbed } from "../../lib/Embed.ts";
import { nekosLife } from "../../lib/nekosLife.ts";

export class FeedCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "feed",
            description: "Feed someone",
            options: [
                {
                    name: "user",
                    required: true,
                    description: "User",
                    type: ApplicationCommandOptionType.USER
                }
            ]
        }

        this.category = "Roleplay";
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const user: User = ctx.option("user");

        const url = (await nekosLife.feed()).url;

        const embed = VortexRolePlayEmbed(ctx.user.username, user.username, "fed", url)

        ctx.reply({embeds: [embed]});
    }
}