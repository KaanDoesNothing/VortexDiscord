import {VortexEvent} from "../lib/structures/Event";
import {VortexClient} from "../lib/Client";
import {UserTable} from "../lib/Database";
import {MessageReaction} from "discord.js";
import {EmojiDislike, EmojiLike} from "../lib/Constant";
export class messageReactionAddEvent extends VortexEvent {
    constructor(client: VortexClient) {
        super(client);

        this.type = "messageReactionAdd";
    }

    async exec(e: MessageReaction): Promise<void> {
        await this.client.userDataExists(e.message.author.id);

        const userData = await UserTable.findOne({user_id: e.message.author.id});

        if(e.emoji.name === EmojiLike) {
            userData.profile.likes++;

            await userData.save();
        }else if(e.emoji.name === EmojiDislike) {
            userData.profile.dislikes++;

            await userData.save();
        }
    }
}

export class messageReactionRemoveEvent extends VortexEvent {
    constructor(client: VortexClient) {
        super(client);

        this.type = "messageReactionRemove";
    }

    async exec(e: MessageReaction): Promise<void> {
        await this.client.userDataExists(e.message.author.id);

        const userData = await UserTable.findOne({user_id: e.message.author.id});

        if(e.emoji.name === EmojiLike) {
            userData.profile.likes--;

            await userData.save();
        }else if(e.emoji.name === EmojiDislike) {
            userData.profile.dislikes--;

            await userData.save();
        }
    }
}