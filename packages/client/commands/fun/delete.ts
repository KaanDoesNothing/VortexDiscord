import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { renderAvatarMeme } from "../../lib/images";

// /delete [user]: Delete someone meme with someone's avatar (defaults to you).
export class DeleteCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("delete")
        .setDescription("Put someone's avatar in the trash with a fake \"Delete this?\" dialog")
        .addUserOption((option) => option.setName("user").setDescription("Whose avatar to use"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("user") ?? ctx.user;

        // Image rendering can take a moment; defer so Discord doesn't time out.
        await ctx.deferReply();

        const image = await renderAvatarMeme(user, {
            file: "delete.png",
            width: 748,
            height: 356,
            layers: [
                { kind: "template", x: 0, y: 0, width: 748, height: 356 },
                { kind: "avatar", x: 122, y: 136, width: 191, height: 191 }
            ]
        });

        return ctx.editReply({ files: [{ name: "delete.png", attachment: image }] });
    }
}
