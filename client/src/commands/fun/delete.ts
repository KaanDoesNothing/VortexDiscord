import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {funCategoryName} from "./mod";
import {Canvas, loadImage} from "canvas-constructor/napi-rs";

export class DeleteCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("delete")
        .setDescription("Delete someone")
        .addUserOption((arg) => arg.setName("user").setDescription("user").setRequired(false));

    category = funCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        const user = ctx.options.getUser("user") || ctx.user;

        const background = await loadImage("./assets/img/delete.png");

        const avatar = await loadImage(user.avatarURL());


        const img = await new Canvas(748, 356)
            .printImage(background, 0, 0)
            .printImage(avatar, 122, 136, 191, 191)
            .pngAsync();

        await ctx.reply({files: [{name: "Delete.png", attachment: img}]});
    }
}