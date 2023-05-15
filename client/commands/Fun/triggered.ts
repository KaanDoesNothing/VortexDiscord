import { ApplicationCommandInteraction, ApplicationCommandOptionType, MessageAttachment, User } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import {Image} from "imagescript/mod.ts";

export class TriggeredCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "triggered",
            description: "Trigger someone",
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
        const triggeredImg = await Deno.readFile(`${Deno.cwd()}/assets/img/triggered.png`);

        const avatar = await Image.decode(avatarImg);
        const triggered = await Image.decode(triggeredImg);

        const image = new Image(1000, 1000)
            .composite(avatar.resize(1000, 1000), 0, 0)
            .composite(triggered.resize(1000, 200), 0, 800);
            
        const res = await image.encodeJPEG();

        const attachment = new MessageAttachment("triggered.jpg", res);

        ctx.reply({files: [attachment]});
    }
}