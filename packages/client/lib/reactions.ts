import type { MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";
import { EmojiDislike, EmojiLike } from "./constant";
import { DBManager } from "./database";

// 👍 / 👎 on someone's message adds (delta 1) or removes (delta -1) a like/dislike on their /profile.
export async function handleReaction(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser, delta: 1 | -1) {
    const kind = reaction.emoji.name === EmojiLike ? "likes" : reaction.emoji.name === EmojiDislike ? "dislikes" : null;
    if (!kind || user.bot) return;

    // Reactions on messages from before the bot started arrive as partials without an author.
    const message = reaction.message.partial ? await reaction.message.fetch().catch(() => null) : reaction.message;
    const author = message?.author;

    // No liking your own messages, and bots don't have profiles.
    if (!author || author.bot || author.id === user.id) return;

    await DBManager.adjustReaction(author.id, kind, delta);
}
