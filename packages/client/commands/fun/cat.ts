import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { apiErrorMessage, getJson } from "../../lib/http";
import { VortexCommand } from "../../lib/structures/command";
import { VortexEmbed } from "../../lib/structures/embed";

// /cat: a random cat picture (TheCatAPI).
export class CatCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["kitty", "meow"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("cat")
        .setDescription("A random cat picture 🐱");

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        await ctx.deferReply();
        try {
            const [cat] = await getJson<{ url: string }[]>("https://api.thecatapi.com/v1/images/search");
            return ctx.editReply({ embeds: [new VortexEmbed().setTitle("🐱 Meow!").setImage(cat!.url)] });
        } catch (error) {
            return ctx.editReply(apiErrorMessage(error));
        }
    }
}
