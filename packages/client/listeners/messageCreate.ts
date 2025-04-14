import {Events, Listener} from "@sapphire/framework";
import {Message} from "discord.js";
import { DBManager } from "../lib/database";

export class MessageCreateListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            once: false,
            event: Events.MessageCreate
        });
    }

    public async run(message: Message) {
        await this.handleExperience(message);
    }

    async handleExperience(message: Message) {
        const guildData = await DBManager.getGuild(message.guild!.id);
        const guildUserData = await DBManager.getGuildUser(message.guild!.id, message.author.id);

        // if(guildData.settings.economy.experience.enabled) {
        //     guildUserData.economy.experience.messages++;

        //     const nextLevel = MessagesToLevel * guildUserData.economy.experience.level;

        //     if(guildUserData.economy.experience.messages > nextLevel) {
        //         guildUserData.economy.experience.level++;

        //         const levelEmbed = new VortexEmbed()
        //             .setAuthor({name: msg.author.tag, iconURL: msg.author.avatarURL()})
        //             .setDescription(`${msg.author.tag} is now level ${guildUserData.economy.experience.level}!`);

        //         msg.channel.send({embeds: [levelEmbed]});
        //     }

        //     await guildUserData.save();
        // }
    }
}