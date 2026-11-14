import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { renderAvatarMeme } from "../../lib/images";

// /triggered [user]: Trigger someone meme with someone's avatar (defaults to you).
export class TriggeredCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("triggered")
        .setDescription("Slap a TRIGGERED banner on someone's avatar")
        .addUserOption((option) => option.setName("user").setDescription("Whose avatar to use"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("user") ?? ctx.user;

        // Image rendering can take a moment; defer so Discord doesn't time out.
        await ctx.deferReply();

        const image = await renderAvatarMeme(user, {
            file: "triggered.png",
            width: 1000,
            height: 1000,
            layers: [
                { kind: "avatar", x: 0, y: 0, width: 1000, height: 1000 },
                { kind: "template", x: 0, y: 800, width: 1000, height: 200 }
            ]
        });

        return ctx.editReply({ files: [{ name: "triggered.png", attachment: image }] });
    }
}
