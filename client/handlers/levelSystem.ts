import { Message } from "harmony/mod.ts"
import { GuildTable, GuildUserTable } from "../lib/Database.ts";
import { MessagesToLevel } from "../lib/Constant.ts";
import { VortexEmbed } from "../lib/Embed.ts";

export const levelSystemHandler = async (msg: Message) => {
    const guildData = await GuildTable.findOne({guild_id: msg.guildID});
    const guildUserData = await GuildUserTable.findOne({guild_id: msg.guildID, user_id: msg.author.id});

    if(guildData.settings.economy.experience.enabled) {
        guildUserData.economy.experience.messages++;

        const nextLevel = MessagesToLevel * guildUserData.economy.experience.level;

        if(guildUserData.economy.experience.messages > nextLevel) {
            guildUserData.economy.experience.level++;

            const levelEmbed = new VortexEmbed()
                .setAuthor(msg.author.tag, msg.author.avatarURL())
                .setDescription(`${msg.author.tag} is now level ${guildUserData.economy.experience.level}!`);

            msg.channel.send({embeds: [levelEmbed]});
        }

        await guildUserData.save();   
    }
}