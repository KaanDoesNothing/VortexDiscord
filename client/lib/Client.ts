import {config as env} from "dotenv/mod.ts";

import {ApplicationCommandInteraction, CommandClient, Message, MessageReaction, PermissionFlags, event} from "harmony/mod.ts";
import { GuildTable, GuildUserTable, UserTable } from "./Database.ts";
import { VortexCommand } from "./Command.ts";
import { ClientMissingPermission, MemberMissingPermission } from "./Language.ts";
import { EmojiDislike, EmojiLike } from "./Constant.ts";
import { levelSystemHandler } from "../handlers/levelSystem.ts";
import { blacklistSystemHandler } from "../handlers/blacklistSystem.ts";
import * as commands from "../commands/mod.ts";

export class VortexClient extends CommandClient {
    public executables: {commands: Map<string, VortexCommand>}
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
        console.time("Loaded Commands");
        await this.loadCommands();
        console.timeEnd("Loaded Commands");
        console.log("Initialized!");
    }

    async loadCommands(): Promise<void> {
        const list = [];

        for (const i in commands) {
            const command = commands[i];
            const instance = new command(this);
            console.log(`Command Loaded: ${instance.config.name}`);

            list.push(instance.config);

            this.executables.commands.set(instance.config.name, instance);
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

        await levelSystemHandler(msg);
        await blacklistSystemHandler(msg);
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
                    if(command.userPermissions.length > 0 || command.clientPermissions.length > 0) {
                        const MemberMissingPermissions: string[] = [];
                        const ClientMissingPermissions: string[] = [];

                        if(!interaction.member) return;

                        command.userPermissions.forEach((permission) => {
                            const flag = (PermissionFlags as any)[permission];
                            if(!interaction.member?.permissions.has(flag)) MemberMissingPermissions.push(permission);
                        });

                        if(MemberMissingPermissions.length > 0) {
                            interaction.reply(MemberMissingPermission(MemberMissingPermissions));
                            return;
                        }

                        command.clientPermissions.forEach((permission) => {
                            const flag = (PermissionFlags as any)[permission];
                            if(interaction.member?.permissions.has(flag)) ClientMissingPermissions.push(permission);
                        });

                        if(ClientMissingPermissions.length > 0) {
                            interaction.reply(ClientMissingPermission(ClientMissingPermissions));
                            return;
                        }
                    }

                    await command.exec(interaction);
                    this.statistics.commands.ran++;
                }catch(err) {
                    console.log(err);
                }
            }
        }
    }
}