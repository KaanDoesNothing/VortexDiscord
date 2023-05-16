import {config as env} from "dotenv/mod.ts";

import {ApplicationCommandInteraction, CommandClient, Message, MessageReaction, PermissionFlags, event, RedisCacheAdapter} from "harmony/mod.ts";
import { GuildTable, GuildUserTable, UserTable } from "./Database.ts";
import { VortexCommand } from "./Command.ts";
import { ClientMissingPermission, MemberMissingPermission } from "./Language.ts";
import { EmojiDislike, EmojiLike } from "./Constant.ts";
import { levelSystemHandler } from "../handlers/levelSystem.ts";
import { blacklistSystemHandler } from "../handlers/blacklistSystem.ts";
import * as commands from "../commands/mod.ts";
import { musicManager } from "./MusicManager.ts";
import { lavaNode } from "./lavalink.ts";
import { VortexEmbed } from "./Embed.ts";
import { prefixCommandHandler } from "./prefixCommand.ts";

export class VortexClient extends CommandClient {
    public executables: {commands: Map<string, VortexCommand>}
    public statistics: {commands: {ran: number}, messages: {read: number}};
    MusicManager: musicManager;
    constructor() {
        super({
            cache: new RedisCacheAdapter({host: "localhost", port: 7808}),
            token: env().DISCORD_TOKEN as string,
            prefix: "========>",
            caseSensitive: false,
            intents: [
                "GUILDS",
                "GUILD_MESSAGES",
                "GUILD_MESSAGE_REACTIONS",
                "GUILD_VOICE_STATES",
                "MESSAGE_CONTENT"
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

        this.MusicManager = new musicManager(this);

        lavaNode.on("connect", node => console.log(`now connected...`));
    }

    async loadCommands(): Promise<void> {
        const list = [];

        for (const i in commands) {
            const command = commands[i];
            const instance = new command(this);
            console.log(`Command Loaded: ${instance.config.name}`);

            instance.after();

            list.push(instance.config);

            this.executables.commands.set(instance.config.name, instance);
        }

        await this.interactions.commands.bulkEdit(list);
    }

    @event()
    raw(e, payload) {
        switch (e) {
            case "VOICE_STATE_UPDATE":
            case "VOICE_SERVER_UPDATE": {
                lavaNode.handleVoiceUpdate(payload);
            }
        }
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

        lavaNode.connect(BigInt(this.user!.id));
    }

    @event()
    async messageReactionAdd(e: MessageReaction): Promise<void> {
        await this.userDataExists(e.message.author.id);

        const userData = await UserTable.findOne({user_id: e.message.author.id});

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
        await this.userDataExists(e.message.author.id);

        const userData = await UserTable.findOne({user_id: e.message.author.id});

        if(e.emoji.name === EmojiLike) {
            userData.profile.likes--;

            await userData.save();
        }else if(e.emoji.name === EmojiDislike) {
            userData.profile.dislikes--;

            await userData.save();
        }
    }

    async userDataExists(user_id: string): Promise<void> {
        const userData = await UserTable.findOne({user_id});
        if(!userData) {
            (await UserTable.create({user_id})).save();
        }

        return;
    }

    async guildDataExists(guild_id: string): Promise<void> {
        const guildData = await GuildTable.findOne({guild_id});

        if(!guildData) {
            (await GuildTable.create({guild_id})).save();
        }

        return;
    }

    async guildUserDataExists(guild_id: string, user_id: string): Promise<void> {
        const guildUserData = await GuildUserTable.findOne({guild_id, user_id});

        if(!guildUserData) {
            (await GuildUserTable.create({user_id, guild_id})).save();
        }

        return;
    }

    // async prefixCommandHandler(msg: Message, command: VortexCommand) {
    //     const options = new Map();
    //     const args = argsParser(msg.content).argv;
    //     const errors = [];

    //     for (const i in args) {
    //         const arg = args[i];
    //         const option = command.config.options.filter(row => row.name === i)[0];
    //         if(!option) continue;

    //         if(option.type === ApplicationCommandOptionType.USER) {
    //             const id = arg.replaceAll("<", "").replaceAll(">", "").replaceAll("@", "");
    //             try {
    //                 const user = await this.users.get(id) || await this.users.fetch(id);
    //                 options.set(i, user);
    //             }catch(_err) {
    //                 errors.push("Invalid User");
    //             }
    //         }else if(option.type === ApplicationCommandOptionType.STRING) {
    //             options.set(i, arg);
    //         }else if(option.type === ApplicationCommandOptionType.NUMBER) {
    //             if(parseInt(arg)) {
    //                 options.set(i, parseInt(arg));
    //             }else {
    //                 errors.push("Invalid Number");
    //             }
    //         }
    //     }

    //     if(options.size < command.config.options.filter(option => option.required).length) errors.push(`Missing Arguments(${command.config.options.filter(option => !options.has(option.name)).map(option => option.name).join(", ")})`);

    //     if(errors.length > 0) {
    //         return {error: `Errors: ${errors.join(", ")}`};
    //     }

    //     return {
    //         client: this,
    //         data: {
    //             name: command.config.name
    //         },
    //         reply: (...content) => msg.reply(...content),
    //         user: msg.author,
    //         guild: msg.guild,
    //         guildID: msg.guildID,
    //         channel: msg.channel,
    //         channelID: msg.channel.id,
    //         resolved: true,
    //         option: (name: string) => {
    //             return options.get(name);
    //         }
    //     }
    // }

    @event()
    async messageCreate(msg: Message) {
        this.statistics.messages.read++;

        if(msg.author.bot) return;
        
        await this.userDataExists(msg.author.id);
        await this.guildDataExists(msg.guildID);
        await this.guildUserDataExists(msg.guildID, msg.author.id);

        const guildData = await GuildTable.findOne({guild_id: msg.guildID});

        await levelSystemHandler(msg);
        await blacklistSystemHandler(msg);

        if(msg.content.startsWith(guildData.settings.prefix)) {
            const commandName = msg.content.slice(guildData.settings.prefix.length).trim().split(/ +/g).shift().toLowerCase();
            const command = this.executables.commands.get(commandName);
            if(!command) return;

            if(msg.content.includes("--help")) {
                return msg.reply({embeds: [new VortexEmbed().setTitle(command.config.name).setDescription(`${guildData.settings.prefix}${command.usage.prefix}`)]});
            }
            
            
            const polyfill = await (new prefixCommandHandler(msg, command)).parse();

            if(polyfill.error) {
                return msg.reply(polyfill.error);
            }

            await command.exec(polyfill as any);
            this.statistics.commands.ran++;
        }
    }

    @event()
    async interactionCreate(interaction: ApplicationCommandInteraction) {
        if(interaction.isApplicationCommand()) {
            await this.userDataExists(interaction.user.id);
            
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