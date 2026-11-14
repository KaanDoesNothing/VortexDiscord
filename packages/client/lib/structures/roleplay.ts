import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, type User } from "discord.js";
import { VortexCommand } from "./command";

// Shared base for the roleplay commands (/hug, /pat, /dance...): each one only declares its
// name, the nekos.best GIF category, a description and the message text.
//
// Actions (hug, slap...) need a target. Emotes (dance, cry...) work alone or with someone:
// "/dance" → "Alex is dancing", "/dance @Sam" → "Alex is dancing with Sam".
export abstract class RoleplayCommand extends VortexCommand {
    // nekos.best category, see https://docs.nekos.best
    protected abstract readonly gif: string;
    // e.g. (author, target) => `${author} hugged ${target}`
    protected abstract message(author: string, target: string): string;
    // Message without a target (emotes), or when someone targets themselves.
    protected selfMessage(author: string) {
        return `${author} is feeling lonely…`;
    }

    // Builds the slash definition. `targetRequired: false` makes it an emote.
    protected define(name: string, description: string, targetRequired = true) {
        return new SlashCommandBuilder()
            .setName(name)
            .setDescription(description)
            .addUserOption((option) => option.setName("member")
                .setDescription(targetRequired ? "Who to do it to" : "Do it with someone (optional)")
                .setRequired(targetRequired));
    }

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const target: User | null = ctx.options.getUser("member");
        const name = (user: User) => ctx.guild?.members.cache.get(user.id)?.displayName ?? user.displayName;

        const title = !target || target.id === ctx.user.id ? this.selfMessage(name(ctx.user)) : this.message(name(ctx.user), name(target));

        return ctx.reply(await this.roleplayEmbed(this.gif, title));
    }
}
