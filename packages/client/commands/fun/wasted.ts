import { Command } from "@sapphire/framework";
import { GuildMember, SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { Canvas, loadImage } from "canvas-constructor/cairo";

export class WastedCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("wasted")
        .setDescription("Wasted")
        .addUserOption((option) => option.setName("user").setDescription("User"))

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const member = ctx.options.getMember("user") as GuildMember || ctx.member;

        const background = await loadImage("./assets/img/wasted.png");

        const avatar = await loadImage(member.user.avatarURL({size: 1024, extension: "png"})!);

        const img = await new Canvas(1000, 1000)
            .printImage(avatar, 0, 0, 1000, 1000)
            .printImage(background, 0, 0, 1000, 1000)
            .pngAsync();

        return ctx.reply({files: [{name: "Wasted.png", attachment: img}]});
    }
}