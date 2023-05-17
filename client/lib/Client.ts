import {config as env} from "dotenv/mod.ts";

import { CommandClient, event, RedisCacheAdapter} from "harmony/mod.ts";
import { GuildTable, GuildUserTable, UserTable } from "./Database.ts";
import { VortexCommand } from "./Command.ts";
import * as commands from "../commands/mod.ts";
import { musicManager } from "./MusicManager.ts";
import { lavaNode } from "./lavalink.ts";
import * as extensions from "../extensions/mod.ts";

export class VortexClient extends CommandClient {
    public executables: {commands: Map<string, VortexCommand>}
    public statistics: {commands: {ran: number}, messages: {read: number}};
    MusicManager: musicManager;
    constructor() {
        super({
            // cache: new RedisCacheAdapter({hostname: "localhost", port: 7808}),
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
        console.time("Loaded Extensions");
        this.loadExtensions();
        console.timeEnd("Loaded Extensions");

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

            if(!instance.hidden) {
                list.push(instance.config);
            }

            this.executables.commands.set(instance.config.name, instance);
        }

        await this.interactions.commands.bulkEdit(list);
    }

    loadExtensions(): void {
        for (const i in extensions) {
            const extension = extensions[i];
            this.extensions.load(extension);
            console.log(`Extension Loaded`, extension);
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

        if (!guildUserData) {
            (await GuildUserTable.create({user_id, guild_id})).save();
        }

        return;
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

        // await lavaNode.connect(BigInt(this.user!.id));
    }
}