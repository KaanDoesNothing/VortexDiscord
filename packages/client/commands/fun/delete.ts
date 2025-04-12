import { Command } from "@sapphire/framework";
import { GuildMember, SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { Canvas, loadImage } from "canvas-constructor/cairo";

export class DeleteCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("delete")
        .setDescription("Delete someone")
        .addUserOption((option) => option.setName("user").setDescription("User"))

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const member = ctx.options.getMember("user") as GuildMember || ctx.member;

        const background = await loadImage("./assets/img/delete.png");

        const avatar = await loadImage(member.user.avatarURL({size: 1024, extension: "png"})!);

        const img = await new Canvas(748, 356)
            .printImage(background, 0, 0)
            .printImage(avatar, 122, 136, 191, 191)
            .pngAsync();

        return ctx.reply({files: [{name: "Delete.png", attachment: img}]});
    }
}