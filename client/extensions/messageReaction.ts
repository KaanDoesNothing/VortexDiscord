import { MessageReaction, event } from "harmony/mod.ts";
import { VortexClient } from "../lib/Client.ts";
import { VortexExtension } from "../lib/Extension.ts";
import { UserTable } from "../lib/Database.ts";
import { EmojiDislike, EmojiLike } from "../lib/Constant.ts";

export class messageReactionExtension extends VortexExtension {
    constructor(client: VortexClient) {
        super(client);

        this.name = "messageReaction";
    }

    @event()
    async messageReactionAdd(_, e: MessageReaction): Promise<void> {
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

    @event()
    async messageReactionRemove(_, e: MessageReaction): Promise<void> {
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