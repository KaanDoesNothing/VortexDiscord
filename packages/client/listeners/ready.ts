import {Events, Listener} from "@sapphire/framework";
import {ActivityType, type VoiceBasedChannel} from "discord.js";

export class ReadyListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            once: false,
            event: Events.ClientReady
        });
    }

    public async run() {
        console.log(`Shard ${this.container.client.guilds.cache.at(0)?.shardId} - Ready`);

        await this.container.client.user!.setPresence({activities: [{name: `=>help | ${this.container.client.guilds.cache.size} Servers`, url: `https://www.twitch.tv/${this.container.client.user!.username}`, type: 1}]});
    }
}