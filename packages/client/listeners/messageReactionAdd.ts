import {Events, Listener} from "@sapphire/framework";
import {Message, MessageReaction} from "discord.js";
import { DBManager } from "../lib/database";
import { EmojiDislike, EmojiLike } from "../lib/constant";

export class MessageReactionAdd extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, {
            ...options,
            once: false,
            event: Events.MessageReactionAdd
        });
    }

    public async run(e: MessageReaction) {
        const userData = await DBManager.getUser(e.message.author!.id);

        if(e.emoji.name === EmojiLike) {
            userData.profile!.likes++;

            await userData.save();
        }else if(e.emoji.name === EmojiDislike) {
            userData.profile!.dislikes++;

            await userData.save();
        }
    }
}