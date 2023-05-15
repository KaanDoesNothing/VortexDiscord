import { ApplicationCommandInteraction, ApplicationCommandOptionType, User } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import { GuildUserTable, UserTable } from "../../lib/Database.ts";
import { CurrencyName, NoUserDBEntry } from "../../lib/Language.ts";
import { VortexEmbed } from "../../lib/Embed.ts";
import { convertObjectToParams } from "../../lib/utils.ts";

export class ProfileCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "profile",
            description: "Profile",
            options: [
                {
                    name: "user",
                    required: false,
                    description: "User",
                    type: ApplicationCommandOptionType.USER
                }
            ]
        }

        this.category = "Social";
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const user: User = ctx.option("user") || ctx.user;

        console.log(`http://localhost:7806/profile?${convertObjectToParams({username: user.username, user_id: user.id, avatar: user.avatar})}`);

        const userData = await UserTable.findOne({user_id: user.id});
        const userGuildData = await GuildUserTable.findOne({guild_id: ctx.guild?.id, user_id: user.id});

        if(!userData) {
            ctx.reply(NoUserDBEntry);
            return;
        }

        const embed = new VortexEmbed()
            .setAuthor(user.tag, user.avatarURL())
            .setImage(user.avatarURL())
            .addField(CurrencyName, userData.economy.money.value, true)
            .addField("Server Level", userGuildData.economy.experience.level, true)
            .addField("\u200b", "\u200b", false)
            .addField("Likes", userData.profile.likes.toString(), true)
            .addField("Dislikes", userData.profile.dislikes.toString(), true)
            .setFooter(`Bio: ${userData.profile.description}`)
        
        ctx.reply({embeds: [embed]});
    }
}