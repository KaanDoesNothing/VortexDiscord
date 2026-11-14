import { Events, Listener } from "@sapphire/framework";
import type { MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";
import { handleReaction } from "../lib/reactions";

// 👍 / 👎 on someone's message adds a like/dislike to their /profile.
export class MessageReactionAddListener extends Listener<typeof Events.MessageReactionAdd> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, event: Events.MessageReactionAdd });
    }

    public async run(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
        return handleReaction(reaction, user, 1);
    }
}
