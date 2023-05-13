import { ApplicationCommandInteraction, ApplicationCommandOptionType, User } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { VortexEmbed } from "../../lib/Embed.ts";

export default class UserInfoCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "userinfo",
            description: "User information",
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
            .setThumbnail(user.avatarURL("png") as string)
            .addField("Name", user.tag, true)
            .addField("ID", user.id, true)

        ctx.reply({embeds: [embed]});
    }
}