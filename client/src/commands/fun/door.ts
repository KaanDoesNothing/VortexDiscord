import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {funCategoryName} from "./mod";
import {Canvas, loadImage} from "canvas-constructor/napi-rs";

export class DoorCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("door")
        .setDescription("Door")
        .addUserOption((arg) => arg.setName("user").setDescription("user").setRequired(false));

    category = funCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<void> {
        const user = ctx.options.getUser("user") || ctx.user;

        const background = await loadImage("./assets/img/door.png");

        const avatar = await loadImage(user.avatarURL());


        const img = await new Canvas(1000, 479)
            .printImage(avatar, 330, 15, 330, 450)
            .printImage(background, 0, 0)
            .pngAsync();

        await ctx.reply({files: [{name: "Delete.png", attachment: img}]});
    }
}