import { ApplicationCommandInteraction, ApplicationCommandOptionType, MessageAttachment, User } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import {Image} from "imagescript/mod.ts";

export class WastedCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "wasted",
            description: "Wasted",
            options: [
                {
                    name: "user",
                    required: true,
                    description: "User",
                    type: ApplicationCommandOptionType.USER
                }
            ]
        }

        this.category = "Fun";
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const user: User = ctx.option("user") || ctx.user;

        const avatarImg = (await fetch(user.avatarURL("png")).then(res => res.arrayBuffer()));
        const wastedImg = await Deno.readFile(`${Deno.cwd()}/assets/img/wasted.png`);

        const avatar = await Image.decode(avatarImg);
        const wasted = await Image.decode(wastedImg);

        const image = new Image(1000, 1000)
            .composite(avatar.resize(1000, 1000), 0, 0)
            .composite(wasted.resize(1000, 1000), 0, 0);
            
        const res = await image.encodeJPEG();

        const attachment = new MessageAttachment("wasted.jpg", res);

        ctx.reply({files: [attachment]});
    }
}