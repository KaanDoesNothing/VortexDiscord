import {VortexExtension} from "../lib/Extension.ts";
import {VortexClient} from "../lib/Client.ts";
import {event} from "harmony/src/client/client.ts";
import {Message} from "harmony/src/structures/message.ts";
import {GuildTable, GuildUserTable} from "../lib/Database.ts";
import {VortexEmbed} from "../lib/Embed.ts";
import {prefixCommandHandler} from "../lib/prefixCommand.ts";
import {MessagesToLevel} from "../lib/Constant.ts";

export class messageCreateExtension extends VortexExtension {
    constructor(client: VortexClient) {
        super(client);

        this.name = "message";
    }
    @event()
    async messageCreate(_, msg: Message) {
        this.client.statistics.messages.read++;

        if(msg.author.bot) return;

        await this.client.userDataExists(msg.author.id);
        await this.client.guildDataExists(msg.guildID);
        await this.client.guildUserDataExists(msg.guildID, msg.author.id);

        const guildData = await GuildTable.findOne({guild_id: msg.guildID});

        await this.handleLevel(msg);
        await this.handleBlacklist(msg);

        if(msg.content.startsWith(guildData.settings.prefix)) {
            const commandName = msg.content.slice(guildData.settings.prefix.length).trim().split(/ +/g).shift().toLowerCase();
            const command = this.client.executables.commands.get(commandName);
            if(!command) return;

            if(msg.content.includes("--help")) {
                return msg.reply({embeds: [new VortexEmbed().setTitle(command.config.name).setDescription(`${guildData.settings.prefix}${command.usage.prefix}`)]});
            }


            const polyfill = await (new prefixCommandHandler(msg, command)).parse();

            if(polyfill.error) {
                return msg.reply(polyfill.error);
            }

            await command.exec(polyfill as any);
            this.client.statistics.commands.ran++;
        }
    }

    async handleLevel(msg: Message) {
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

    async handleBlacklist(msg: Message) {
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
}
