import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";
import { renderAvatarMeme } from "../../lib/images";

// /wasted [user]: Wasted meme with someone's avatar (defaults to you).
export class WastedCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("wasted")
        .setDescription("Give someone's avatar the GTA-style WASTED screen")
        .addUserOption((option) => option.setName("user").setDescription("Whose avatar to use"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("user") ?? ctx.user;

        // Image rendering can take a moment; defer so Discord doesn't time out.
        await ctx.deferReply();

        const image = await renderAvatarMeme(user, {
            file: "wasted.png",
            width: 1000,
            height: 1000,
            layers: [
                { kind: "avatar", x: 0, y: 0, width: 1000, height: 1000 },
                { kind: "template", x: 0, y: 0, width: 1000, height: 1000 }
            ]
        });

        return ctx.editReply({ files: [{ name: "wasted.png", attachment: image }] });
    }
}
