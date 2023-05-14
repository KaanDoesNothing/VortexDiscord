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

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const user: User = ctx.option("user") || ctx.user;
        const member = await ctx.guild.members.get(user.id);
        const roles = await member.roles.array();

        const embed = new VortexEmbed()
            .setThumbnail(user.avatarURL("png") as string)
            .addField("Name", user.tag, true)
            .addField("ID", user.id, true)
            .addField("Joined", new Date(member.joinedAt).toLocaleString())
            .addField("Created", user.timestamp.toLocaleString(), true)
            .setFooter(`Roles: ${roles.map(role => `${role.name}`).join(", ")}`)

        ctx.reply({embeds: [embed]});
    }
}