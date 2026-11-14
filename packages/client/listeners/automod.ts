import { Events, Listener } from "@sapphire/framework";
import type { Message } from "discord.js";
import { runAutomod } from "../lib/automod";

// Runs auto-mod on every new message (see lib/automod.ts).
export class AutomodListener extends Listener<typeof Events.MessageCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "AutomodCreate", event: Events.MessageCreate });
    }

    public async run(message: Message) {
        await runAutomod(message);
    }
}

// ...and on edits, so people can't post something clean and edit the bad part in afterwards.
export class AutomodEditListener extends Listener<typeof Events.MessageUpdate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "AutomodUpdate", event: Events.MessageUpdate });
    }

    public async run(_old: unknown, message: Message) {
        if (message.partial) return;
        await runAutomod(message);
    }
}
