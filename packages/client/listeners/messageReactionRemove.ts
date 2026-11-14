import { Events, Listener } from "@sapphire/framework";
import type { MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";
import { handleReaction } from "../lib/reactions";

// Removing a 👍 / 👎 takes the like/dislike back.
export class MessageReactionRemoveListener extends Listener<typeof Events.MessageReactionRemove> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, event: Events.MessageReactionRemove });
    }

    public async run(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
        return handleReaction(reaction, user, -1);
    }
}
