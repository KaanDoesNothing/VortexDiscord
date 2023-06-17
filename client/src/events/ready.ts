import {VortexEvent} from "../lib/structures/Event";
import {Events, Routes, SlashCommandBuilder} from "discord.js";
import {Botlist, BotListPoster} from "dblwrapper.js";
import {VortexClient} from "../lib/Client";
import {rest} from "../index";
import {VortexConfig} from "../config";

export class readyEvent extends VortexEvent {
    constructor(client: VortexClient) {
        super(client);

        this.type = "ready";
    }

    async exec(): Promise<void> {
        console.log(`Logged in as ${this.client.user?.tag}!`);

        await this.client.initialize();

        const applicationBody: (SlashCommandBuilder | undefined)[] = [];

        this.client.executables.commands.forEach(({config}) => {
            return applicationBody.push(config as any);
        });

        await rest.put(Routes.applicationCommands(this.client.user!.id), {body: applicationBody});

        this.client.user.setPresence({activities: [{name: `/announcement, (Important) ${this.client.guilds.cache.size} Servers`, url: `https://www.twitch.tv/${this.client.user.username}`, type: 1}]});

        if(!VortexConfig.DEV) {
            const botLists = [
                new Botlist.TopGG(this.client.user.id, VortexConfig.TOPGG)
            ]

            const poster = new BotListPoster(botLists, {
                shardCount: () =>  this.client.ws.shards.size,
                guildCount: () => this.client.guilds.cache.size,
                userCount: () => this.client.guilds.cache.reduce((prev, next) => prev + next.memberCount, 0),
                voiceConnectionCount: () => 0,
            });

            poster.startAutoPosting(5 * 60 * 1000);
        }
    }
}