import {VortexEvent} from "../lib/structures/Event";
import {Message} from "discord.js";
import {GuildTable, GuildUserTable} from "../lib/Database";
import {MessagesToLevel} from "../lib/Constant";
import {VortexEmbed} from "../lib/structures/Embed";
import {slashParser} from "../lib/slash/polyfill";
import {CommandHandler} from "../lib/CommandHandler";

export class messageEvent extends VortexEvent {
    type = "messageCreate";

    async exec(msg: Message): Promise<void> {
        if(msg.author.bot) return;

        this.client.statistics.messages.read++;

        await this.client.userDataExists(msg.author.id);
        await this.client.guildDataExists(msg.guildId);
        await this.client.guildUserDataExists(msg.guildId, msg.author.id);

        const guildData = await GuildTable.findOne({guild_id: msg.guildId});
        if(!guildData) return;

        await this.handleLevel(msg);

        if(msg.content.startsWith(guildData.settings.prefix as string)) {
            const commandName = msg.content.slice((guildData.settings.prefix as string).length).trim().split(/ +/g).shift().toLowerCase();
            const command = this.client.executables.commands.get(commandName);

            if(!command) return;

            const parser = new slashParser(msg, command);

            const res = await parser.exec();
            if(res.error) {
                await msg.reply(res.error);
                return;
            }

            await new CommandHandler(command).setClient(this.client).exec(res as any);
        }
    }

    async handleLevel(msg: Message) {
        const guildData = await GuildTable.findOne({guild_id: msg.guildId});
        const guildUserData = await GuildUserTable.findOne({guild_id: msg.guildId, user_id: msg.author.id});

        if(guildData.settings.economy.experience.enabled) {
            guildUserData.economy.experience.messages++;

            const nextLevel = MessagesToLevel * guildUserData.economy.experience.level;

            if(guildUserData.economy.experience.messages > nextLevel) {
                guildUserData.economy.experience.level++;

                const levelEmbed = new VortexEmbed()
                    .setAuthor({name: msg.author.tag, iconURL: msg.author.avatarURL()})
                    .setDescription(`${msg.author.tag} is now level ${guildUserData.economy.experience.level}!`);

                msg.channel.send({embeds: [levelEmbed]});
            }

            await guildUserData.save();
        }
    }

    // async handleBlacklist(msg: Message) {
    //     const guildData = await GuildTable.findOne({guild_id: msg.guildId});
    //
    //     guildData.settings.blacklist.words.forEach((word: string) => {
    //         if(msg.content.includes(word)) {
    //             try {
    //                 msg.delete();
    //             }catch(err) {
    //                 console.log(err);
    //             }
    //         }
    //     });
    // }
}