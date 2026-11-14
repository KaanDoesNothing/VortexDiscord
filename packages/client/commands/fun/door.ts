import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { renderAvatarMeme } from "../../lib/images";

// /door [user]: Mysterious door meme with someone's avatar (defaults to you).
export class DoorCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("door")
        .setDescription("Show someone peeking out from behind a mysterious door")
        .addUserOption((option) => option.setName("user").setDescription("Whose avatar to use"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("user") ?? ctx.user;

        // Image rendering can take a moment; defer so Discord doesn't time out.
        await ctx.deferReply();

        const image = await renderAvatarMeme(user, {
            file: "door.png",
            width: 1000,
            height: 479,
            layers: [
                { kind: "avatar", x: 330, y: 15, width: 330, height: 450 },
                { kind: "template", x: 0, y: 0, width: 1000, height: 479 }
            ]
        });

        return ctx.editReply({ files: [{ name: "door.png", attachment: image }] });
    }
}
