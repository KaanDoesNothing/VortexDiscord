import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {funCategoryName} from "./mod";
import {Canvas, loadImage} from "canvas-constructor/napi-rs";

export class WastedCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("wasted")
        .setDescription("Wasted")
        .addUserOption((arg) => arg.setName("user").setDescription("user").setRequired(false));

    category = funCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        const user = ctx.options.getUser("user") || ctx.user;

        const background = await loadImage("./assets/img/wasted.png");

        const avatar = await loadImage(user.avatarURL());

        const img = await new Canvas(1000, 1000)
            .printImage(avatar, 0, 0, 1000, 1000)
            .printImage(background, 0, 0, 1000, 1000)
            .pngAsync();

        await ctx.reply({files: [{name: "Delete.png", attachment: img}]});
    }
}