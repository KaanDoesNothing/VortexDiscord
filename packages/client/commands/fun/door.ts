import { Command } from "@sapphire/framework";
import { GuildMember, SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { Canvas, loadImage } from "canvas-constructor/cairo";

export class DoorCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("door")
        .setDescription("Mysterious Door")
        .addUserOption((option) => option.setName("user").setDescription("User"))

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const member = ctx.options.getMember("user") as GuildMember || ctx.member;

        const background = await loadImage("./assets/img/door.png");

        const avatar = await loadImage(member.user.avatarURL({size: 1024, extension: "png"})!);


        const img = await new Canvas(1000, 479)
            .printImage(avatar, 330, 15, 330, 450)
            .printImage(background, 0, 0)
            .pngAsync();

        return ctx.reply({files: [{name: "Door.png", attachment: img}]});
    }
}