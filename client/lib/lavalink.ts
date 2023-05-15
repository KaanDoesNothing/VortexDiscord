import { Node, Player } from "https://raw.githubusercontent.com/lavaclient/lavadeno/22c88554cfc6f06dee7838eca0b00960cf47477a/mod.ts";
import { client } from "../index.ts";
import { Track } from "https://deno.land/x/lavalink_types@2.0.6/mod.ts";
import { TextChannel } from "harmony/mod.ts";

import {config as env} from "dotenv/mod.ts";

const config = env();

export const lavaNode = new Node({
    connection: {
        host: config.LAVALINK_HOST,
        port: 2333,
        password: config.LAVALINK_PASSWORD,
    },
    sendGatewayPayload: (id, payload) => {
        const shardID = Number(
            (BigInt(id) << 22n) % BigInt(client.shards.cachedShardCount ?? 1),
        );
        const shard = client.shards.get(shardID);
        shard.send(payload);
    },
});

export const Queues = new Map<string, Queue>();

export class Queue {
    guild: string;
    voice_channel: string;
    channel: string;
    tracks: Track[];
    player: Player<Node>;
    constructor(guild: string, voice_channel: string, channel: string) {
        this.guild = guild
        this.channel = channel;
        this.voice_channel = voice_channel;

        this.tracks = [];
        this.player = lavaNode.createPlayer(BigInt(this.guild));

        this.player.on("trackStart", () => this.handleTrackStart())
        this.player.on("trackEnd", () => this.handleTrackEnd());

        Queues.set(guild, this);
    }

    async handleTrackStart() {
        const channel = (await client.channels.get(this.channel)) as TextChannel;
        const currentTrack = this.tracks[0];

        channel.send(`Now playing: ${currentTrack.info.title}!`);
    }

    async handleTrackEnd() {
        this.tracks.shift();

        if(this.tracks.length > 0) {
            this.play();
        }else {
            this.destroy();
        }
    }

    play() {
        this.player.play(this.tracks[0]);
    }

    add(track: Track) {
        this.tracks.push(track);
    }

    async destroy() {
        this.player.disconnect();
        await this.player.destroy();

        Queues.delete(this.guild);

        const channel = (await client.channels.get(this.channel)) as TextChannel;
        channel.send("Leaving voice channel!");
    }
}

lavaNode.on("connect", node => console.log(`now connected...`));
