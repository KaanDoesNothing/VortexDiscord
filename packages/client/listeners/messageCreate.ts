import {Events, Listener} from "@sapphire/framework";
import {Message} from "discord.js";

export class MessageCreateListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            once: false,
            event: Events.MessageCreate
        });
    }

    public async run(message: Message) {
    }
}