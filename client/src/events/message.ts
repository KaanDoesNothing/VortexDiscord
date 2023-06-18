import {VortexEvent} from "../lib/structures/Event";
import {Message} from "discord.js";
import {VortexClient} from "../lib/Client";
import {GuildTable, GuildUserTable} from "../lib/Database";
import {MessagesToLevel} from "../lib/Constant";
import {VortexEmbed} from "../lib/structures/Embed";
import {slashParser} from "../lib/slash/polyfill";

export class messageEvent extends VortexEvent {
    constructor(client: VortexClient) {
        super(client);

        this.type = "messageCreate";
    }

    async exec(msg: Message): Promise<void> {
        if(msg.author.id === this.client.user.id) return;

        this.client.statistics.messages.read++;

        if(msg.author.bot) return;

        await this.client.userDataExists(msg.author.id);
        await this.client.guildDataExists(msg.guildId);
        await this.client.guildUserDataExists(msg.guildId, msg.author.id);

        const guildData = await GuildTable.findOne({guild_id: msg.guildId});

        await this.handleLevel(msg);

        if(!guildData) return;

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

            try {
                const executed = await command.exec(res as any);

                if(typeof executed === "object") {
                    await msg.reply(executed as any);
                }

                this.client.statistics.commands.ran++;
            }catch(err) {
                console.log(err);
                await msg.reply("An error occurred");
            }
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