import { Command } from "@sapphire/framework";
import { GuildMember, SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { Canvas, loadImage } from "canvas-constructor/cairo";

export class TriggeredCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("triggered")
        .setDescription("Trigger someone")
        .addUserOption((option) => option.setName("user").setDescription("User"))

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const member = ctx.options.getMember("user") as GuildMember || ctx.member;

        const background = await loadImage("./assets/img/triggered.png");

        const avatar = await loadImage(member.user.avatarURL({size: 1024, extension: "png"})!);

        const img = await new Canvas(1000, 1000)
            .printImage(avatar, 0, 0, 1000, 1000)
            .printImage(background, 0, 800, 1000, 200)
            .pngAsync();

        return ctx.reply({files: [{name: "Triggered.png", attachment: img}]});
    }
}