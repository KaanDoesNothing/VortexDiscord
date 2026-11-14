import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { apiErrorMessage, getJson } from "../../lib/http";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /dog [breed]: a random dog picture (dog.ceo), optionally of a specific breed.
export class DogCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["doggo", "woof"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("dog")
        .setDescription("A random dog picture 🐶")
        .addStringOption((o) => o.setName("breed").setDescription("e.g. husky, corgi, pug").setMaxLength(40));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const breed = ctx.options.getString("breed")?.trim().toLowerCase().replace(/\s+/g, "/");
        await ctx.deferReply();
        try {
            const url = breed ? `https://dog.ceo/api/breed/${encodeURIComponent(breed).replace("%2F", "/")}/images/random` : "https://dog.ceo/api/breeds/image/random";
            const dog = await getJson<{ message: string; status: string }>(url);
            return ctx.editReply({ embeds: [new VortexEmbed().setTitle("🐶 Woof!").setImage(dog.message)] });
        } catch (error) {
            return ctx.editReply(apiErrorMessage(error).replace("Nothing found.", `No pictures of a "${breed}". Try a breed like husky or corgi.`));
        }
    }
}
