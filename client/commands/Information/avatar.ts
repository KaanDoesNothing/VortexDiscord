import { ApplicationCommandInteraction, ApplicationCommandOptionType, User } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { VortexEmbed } from "../../lib/Embed.ts";

export default class AvatarCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "avatar",
            description: "Avatar",
            options: [
                {
                    name: "user",
                    required: false,
                    description: "User",
                    type: ApplicationCommandOptionType.USER
                }
            ]
        }
    }

    exec(ctx: ApplicationCommandInteraction): void {
        const user: User = ctx.option("user") || ctx.user;

        const embed = new VortexEmbed()
            .setTitle(`${user.tag}'s Avatar`)
            .setImage(user.avatarURL("dynamic"));

        ctx.reply({embeds: [embed]});
    }
}