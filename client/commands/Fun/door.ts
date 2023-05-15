import { ApplicationCommandInteraction, ApplicationCommandOptionType, MessageAttachment, User } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import {Image} from "imagescript/mod.ts";

export class DoorCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "door",
            description: "Door",
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
        const doorImg = await Deno.readFile(`${Deno.cwd()}/assets/img/door.png`);

        const avatar = await Image.decode(avatarImg);
        const door = await Image.decode(doorImg);

        const image = new Image(1000, 479)
            .composite(avatar.resize(330, 450), 330, 15)
            .composite(door, 0, 0);
            
        const res = await image.encodeJPEG();

        const attachment = new MessageAttachment("door.jpg", res);

        ctx.reply({files: [attachment]});
    }
}