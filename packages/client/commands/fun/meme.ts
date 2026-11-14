import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { apiErrorMessage, getJson } from "../../lib/http";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

interface Meme { title: string; url: string; postLink: string; subreddit: string; ups: number; nsfw: boolean; spoiler: boolean }

// Only these subreddits, so results stay on-topic and safe.
const SUBREDDITS = ["memes", "wholesomememes", "dankmemes", "ProgrammerHumor", "me_irl"];

// /meme [subreddit]: a random meme from Reddit (meme-api.com). NSFW posts are always skipped.
export class MemeCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("meme")
        .setDescription("A random meme from Reddit")
        .addStringOption((o) => o.setName("from").setDescription("Which subreddit").addChoices(...SUBREDDITS.map((s) => ({ name: `r/${s}`, value: s }))));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const sub = ctx.options.getString("from") ?? "memes";
        await ctx.deferReply();

        try {
            // Ask for a few and take the first safe one.
            const { memes } = await getJson<{ memes: Meme[] }>(`https://meme-api.com/gimme/${sub}/5`);
            const meme = memes.find((m) => !m.nsfw && !m.spoiler);
            if (!meme) return ctx.editReply("Couldn't find a safe meme right now, try again.");

            const embed = new VortexEmbed()
                .setTitle(meme.title.slice(0, 256))
                .setURL(meme.postLink)
                .setImage(meme.url)
                .setFooter({ text: `r/${meme.subreddit} · ⬆ ${meme.ups.toLocaleString()}` });
            return ctx.editReply({ embeds: [embed] });
        } catch (error) {
            return ctx.editReply(apiErrorMessage(error));
        }
    }
}
