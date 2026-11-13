import {type Awaitable, SapphireClient, type SapphirePrefix} from "@sapphire/framework";
import {Message, type ClientOptions} from "discord.js";

export class VortexClient extends SapphireClient {
    constructor(options: ClientOptions) {
        super(options);

        // this.fetchPrefix = (message: Message) => this.fetchGuildPrefix(message);
    }

    // fetchGuildPrefix(message: Message): Awaitable<SapphirePrefix> {
    //     return this.options.defaultPrefix!;
    // }
}