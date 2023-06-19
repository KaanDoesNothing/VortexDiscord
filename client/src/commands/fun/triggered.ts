import {VortexCommand} from "../../lib/structures/Command";
import {ChatInputCommandInteraction, InteractionReplyOptions, SlashCommandBuilder} from "discord.js";
import {funCategoryName} from "./mod";
import {Canvas, loadImage} from "canvas-constructor/napi-rs";

export class TriggeredCommand extends VortexCommand {
    config = new SlashCommandBuilder()
        .setName("triggered")
        .setDescription("Trigger someone")
        .addUserOption((arg) => arg.setName("user").setDescription("user").setRequired(false));

    category = funCategoryName;

    async exec(ctx: ChatInputCommandInteraction): Promise<InteractionReplyOptions> {
        const user = ctx.options.getUser("user") || ctx.user;

        const background = await loadImage("./assets/img/triggered.png");

        const avatar = await loadImage(user.avatarURL());

        const img = await new Canvas(1000, 1000)
            .printImage(avatar, 0, 0, 1000, 1000)
            .printImage(background, 0, 800, 1000, 200)
            .pngAsync();

        return {files: [{name: "Delete.png", attachment: img}]};
    }
}