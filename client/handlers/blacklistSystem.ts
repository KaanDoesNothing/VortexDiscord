import { Message } from "harmony/mod.ts";
import { GuildTable } from "../lib/Database.ts";

export const blacklistSystemHandler = async (msg: Message) => {
    const guildData = await GuildTable.findOne({guild_id: msg.guildID});

    guildData.settings.blacklist.words.forEach((word: string) => {
        if(msg.content.includes(word)) {
            try {
                msg.delete();
            }catch(err) {
                console.log(err);
            }
        }
    });
}