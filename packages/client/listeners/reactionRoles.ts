import { Events, Listener } from "@sapphire/framework";
import type { MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";
import { handleReactionRole } from "../lib/reactionRoles";

// Reaction roles (set up with /reactionrole): see lib/reactionRoles.ts.
export class ReactionRoleAddListener extends Listener<typeof Events.MessageReactionAdd> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "ReactionRoleAdd", event: Events.MessageReactionAdd });
    }

    public async run(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
        await handleReactionRole(reaction, user, true).catch((error) => this.container.logger.debug("Reaction role failed:", error));
    }
}

export class ReactionRoleRemoveListener extends Listener<typeof Events.MessageReactionRemove> {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, name: "ReactionRoleRemove", event: Events.MessageReactionRemove });
    }

    public async run(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
        await handleReactionRole(reaction, user, false).catch((error) => this.container.logger.debug("Reaction role failed:", error));
    }
}
