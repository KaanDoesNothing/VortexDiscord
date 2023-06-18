import {Client, ClientOptions, Collection, GatewayIntentBits, TextChannel} from "discord.js";
import {VortexCommand} from "./structures/Command";
import {VortexConfig} from "../config";

import * as commands from "../commands/mod";
import * as events from "../events/mod";
import {GuildTable, GuildUserTable, UserTable} from "./Database";
import {Kazagumo} from "kazagumo";
import {Connectors} from "shoukaku";
import {log} from "./Logger";

import { AutoPoster } from "topgg-autoposter";

export class VortexClient extends Client {
    public executables: {commands: Map<string, VortexCommand>};
    public statistics: {commands: {ran: number}, messages: {read: number}};
    public music: Kazagumo;
    constructor(options?: ClientOptions) {
        super({
            ...options || {},
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.MessageContent
            ],
            shards: "auto"
        });

        this.token = VortexConfig.DISCORD_TOKEN;

        this.executables = {
            commands: new Collection()
        }

        this.statistics = {
            commands: {
                ran: 0
            },
            messages: {
                read: 0
            }
        }

        this.music = new Kazagumo({
            defaultSearchEngine: "youtube",
            send: (guildId, payload) => {
                const guild = this.guilds.cache.get(guildId);
                if (guild) guild.shard.send(payload);
            }
        }, new Connectors.DiscordJS(this), [{
            name: VortexConfig.LAVALINK_NAME,
            url: VortexConfig.LAVALINK_URL,
            auth: VortexConfig.LAVALINK_AUTH,
            secure: false
        }]);

        this.music.shoukaku.on("ready", (name: string) => console.log(`Lavalink ${name}: ready!`))

        this.music.on("playerStart", (player, track) => {
            (this.channels.cache.get(player.textId) as TextChannel)?.send({content: `Now playing **${track.title}** by **${track.author}**`})
                .then(x => player.data.set("message", x));
        });

        this.music.on("playerEnd", (player) => {
            player.data.get("message")?.edit({content: `Finished playing`});
        });

        this.music.on("playerEmpty", player => {
            (this.channels.cache.get(player.textId) as TextChannel)?.send({content: `Destroyed player due to inactivity.`})
                .then(x => player.data.set("message", x));
            player.destroy();
        });

        this.loadEvents();

        if(!VortexConfig.DEV) {
            const ap = AutoPoster(VortexConfig.TOPGG, this);

            ap.on("posted", () => {
                console.log("Stats Updated");
            });
        }
    }

    initialize() {
        this.loadCommands();
    }

    loadEvents(): void {
        for (const i in events) {
            // @ts-ignore
            const event = events[i];
            const instance = new event(this);
            log({type: "success", message: `Event Loaded: ${instance.type}`});

            this.on(instance.type, (...args) => {
                instance.exec(...args);
            });
        }
    }

    loadCommands(): void {
        const list = [];

        for (const i in commands) {
            // @ts-ignore
            const command = commands[i];

            if(typeof command === "string") {
                console.log(`Loading category: ${command}`);
                continue;
            }

            const instance = new command(this);
            log({type: "success", message: `Command Loaded: ${instance.config.name}`});

            this.executables.commands.set(instance.config.name, instance);
        }
    }

    async userDataExists(user_id: string): Promise<void> {
        const userData = await UserTable.findOne({user_id});
        if(!userData) {
            await (await UserTable.create({user_id})).save();
        }

        return;
    }

    async guildDataExists(guild_id: string): Promise<void> {
        const guildData = await GuildTable.findOne({guild_id});

        if(!guildData) {
            await (await GuildTable.create({guild_id})).save();
        }

        return;
    }

    async guildUserDataExists(guild_id: string, user_id: string): Promise<void> {
        const guildUserData = await GuildUserTable.findOne({guild_id, user_id});

        if (!guildUserData) {
            await (await GuildUserTable.create({user_id, guild_id})).save();
        }

        return;
    }
}