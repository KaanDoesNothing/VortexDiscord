import { Events, Listener } from "@sapphire/framework";
import type { MessageReaction, PartialMessageReaction } from "discord.js";
import { updateStarboard } from "../lib/engagement";

// Starboard: re-checks a message's star count whenever a reaction is added or removed (lib/engagement.ts).
export class StarboardAddListener extends Listener<typeof Events.MessageReactionAdd> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "StarboardAdd", event: Events.MessageReactionAdd });
    }

    public async run(reaction: MessageReaction | PartialMessageReaction) {
        await updateStarboard(reaction).catch((error) => this.container.logger.debug("Starboard update failed:", error));
    }
}

export class StarboardRemoveListener extends Listener<typeof Events.MessageReactionRemove> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "StarboardRemove", event: Events.MessageReactionRemove });
    }

    public async run(reaction: MessageReaction | PartialMessageReaction) {
        await updateStarboard(reaction).catch((error) => this.container.logger.debug("Starboard update failed:", error));
    }
}
