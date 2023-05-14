import {config as env} from "dotenv/mod.ts";

import {ApplicationCommandInteraction, CommandClient, Message, MessageReaction, PermissionFlags, event} from "harmony/mod.ts";
import { GuildTable, GuildUserTable, UserTable } from "./Database.ts";
import { VortexCommand } from "./Command.ts";
import { ClientMissingPermission, MemberMissingPermission } from "./Language.ts";
import { EmojiDislike, EmojiLike, MessagesToLevel } from "./Constant.ts";
import { VortexEmbed } from "./Embed.ts";

export class VortexClient extends CommandClient {
    public executables: {commands: Map<string, {instance: VortexCommand, information: {category: string}}>}
    public statistics: {commands: {ran: number}, messages: {read: number}};
    // MusicManager: musicManager;
    constructor() {
        super({
            token: env().DISCORD_TOKEN as string,
            prefix: "==>",
            caseSensitive: false,
            intents: [
                "GUILDS",
                "GUILD_MESSAGES",
                "GUILD_MESSAGE_REACTIONS"
            ]
        });

        this.executables = {
            commands: new Map()
        }

        this.statistics = {
            commands: {
                ran: 0
            },
            messages: {
                read: 0
            }
        }

        import("./API/index.ts");
    }

    async initialize(): Promise<void> {
        await this.loadCommands();
        console.log("Initialized!");
    }

    async loadCommands(): Promise<void> {
        const categories = Deno.readDir(`${Deno.cwd()}/commands`);
        
        const list = [];

        for await (const category of categories) {
            if(!category.isDirectory) continue;
            const commandFiles = Deno.readDir(`${Deno.cwd()}/commands/${category.name}`);

            for await (const commandFile of commandFiles) {
                if(!commandFile.name.endsWith(".ts")) continue;
                const file = await import(`${Deno.cwd()}/commands/${category.name}/${commandFile.name}`);
                const instance = new file.default(this);

                console.log(`Command Loaded: ${instance.config.name}`);

                list.push(instance.config);

                this.executables.commands.set(instance.config.name, {instance, information: {category: category.name}});
            }
        }

        await this.interactions.commands.bulkEdit(list);
    }

    @event()
    async ready(): Promise<void> {
        await this.initialize();
        console.log(`Logged in as ${this.user?.tag}`);

        // this.MusicManager.manager.init(this.user.id, {
        //     shards: await this.shards.getShardCount(),
        //     clientName: this.user.username,
        //     clientId: this.user.id.toString()
        // });

        this.setPresence({name: `/announcement, (Important) ${await this.guilds.size()} Servers`, url: `https://www.twitch.tv/${this.user?.username}`, type: 1 });
    }

    @event()
    async messageReactionAdd(e: MessageReaction): Promise<void> {
        const userData = await UserTable.findOne({user_id: e.message.author.id});
        if(!userData) return;

        if(e.emoji.name === EmojiLike) {
            userData.profile.likes++;

            await userData.save();
        }else if(e.emoji.name === EmojiDislike) {
            userData.profile.dislikes++;

            await userData.save();
        }
    }

    @event()
    async messageReactionRemove(e: MessageReaction): Promise<void> {
        const userData = await UserTable.findOne({user_id: e.message.author.id});
        if(!userData) return;

        if(e.emoji.name === EmojiLike) {
            userData.profile.likes--;

            await userData.save();
        }else if(e.emoji.name === EmojiDislike) {
            userData.profile.dislikes--;

            await userData.save();
        }
    }

    @event()
    async messageCreate(msg: Message) {
        this.statistics.messages.read++;

        if(msg.author.bot) return;

        const userData = await UserTable.findOne({user_id: msg.author.id});
        if(!userData) {
            (await UserTable.create({user_id: msg.author.id})).save();

            console.log(`Created User_Data for ${msg.author.id}`);
            
            this.emit("messageCreate", msg);

            return;
        }
            
        
        const guildData = await GuildTable.findOne({guild_id: msg.guildID});

        if(!guildData) {
            (await GuildTable.create({guild_id: msg.guildID})).save();

            console.log(`Created Guild_Data for ${msg.guildID}`);
            
            this.emit("messageCreate", msg);

            return;
        }

        const guildUserData = await GuildUserTable.findOne({guild_id: msg.guildID, user_id: msg.author.id});

        if(!guildUserData) {
            (await GuildUserTable.create({user_id: msg.author.id, guild_id: msg.guildID})).save();

            console.log(`Created Guild_User_Data for ${msg.guildID}:${msg.author.id}`);
            
            this.emit("messageCreate", msg);

            return;
        }

        if(guildData.settings.economy.experience.enabled) {
            guildUserData.economy.experience.messages++;

            const nextLevel = MessagesToLevel * guildUserData.economy.experience.level;

            if(guildUserData.economy.experience.messages > nextLevel) {
                guildUserData.economy.experience.level++;

                const levelEmbed = new VortexEmbed()
                    .setAuthor(msg.author.tag, msg.author.avatarURL())
                    .setDescription(`${msg.author.tag} is now level ${guildUserData.economy.experience.level}!`);

                msg.channel.send({embeds: [levelEmbed]});
                
                console.log(`${msg.guildID}:${msg.author.id} has leveled up`);
            }

            await guildUserData.save();   
        }
    }

    @event()
    async interactionCreate(interaction: ApplicationCommandInteraction) {
        if(interaction.isApplicationCommand()) {
            const userData = await UserTable.findOne({user_id: interaction.user.id});
            if(!userData) {
                (await UserTable.create({user_id: interaction.user.id})).save();

                console.log(`Created User_Data for ${interaction.user.id}`);
                
                this.emit("interactionCreate", interaction);

                return;
            }
            
            const command = this.executables.commands.get(interaction.data.name);

            if(command) {
                try {
                    if(command.instance.userPermissions.length > 0 || command.instance.clientPermissions.length > 0) {
                        const MemberMissingPermissions: string[] = [];
                        const ClientMissingPermissions: string[] = [];

                        if(!interaction.member) return;

                        command.instance.userPermissions.forEach((permission) => {
                            const flag = (PermissionFlags as any)[permission];
                            if(!interaction.member?.permissions.has(flag)) MemberMissingPermissions.push(permission);
                        });

                        if(MemberMissingPermissions.length > 0) {
                            interaction.reply(MemberMissingPermission(MemberMissingPermissions));
                            return;
                        }

                        command.instance.clientPermissions.forEach((permission) => {
                            const flag = (PermissionFlags as any)[permission];
                            if(interaction.member?.permissions.has(flag)) ClientMissingPermissions.push(permission);
                        });

                        if(ClientMissingPermissions.length > 0) {
                            interaction.reply(ClientMissingPermission(ClientMissingPermissions));
                            return;
                        }
                    }

                    await command.instance.exec(interaction);
                    this.statistics.commands.ran++;
                }catch(err) {
                    console.log(err);
                }
            }
        }
    }
}