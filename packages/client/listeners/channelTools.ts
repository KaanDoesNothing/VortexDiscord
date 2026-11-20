import { Events, Listener } from "@sapphire/framework";
import type { Message } from "discord.js";
import { runAutoresponders } from "../lib/autoresponders";
import { isBlacklisted } from "../lib/owner";
import { onMessageForSticky } from "../lib/sticky";

// Per-message channel features: sticky messages (lib/sticky.ts) and autoresponders (lib/autoresponders.ts).
export class ChannelToolsListener extends Listener<typeof Events.MessageCreate> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "ChannelTools", event: Events.MessageCreate });
    }

    public async run(message: Message) {
        if (!message.inGuild()) return;
        // Stickies react to every message, including other bots', so they always stay at the bottom.
        await onMessageForSticky(message).catch(() => null);

        if (message.author.bot || message.webhookId || isBlacklisted(message.author.id, message.guildId)) return;
        await runAutoresponders(message).catch((error) => this.container.logger.debug("Autoresponder failed:", error));
    }
}
