import { ApplicationCommandInteraction, ApplicationCommandOptionType, MessageAttachment, User } from "harmony/mod.ts";
import { VortexCommand } from "../../lib/Command.ts";
import {Image} from "imagescript/mod.ts";

export class DeleteCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "delete",
            description: "Delete someone",
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
        const deletedImg = await Deno.readFile(`${Deno.cwd()}/assets/img/delete.png`);

        const avatar = await Image.decode(avatarImg);
        const deleted = await Image.decode(deletedImg);

        const image = new Image(748, 356)
            .composite(deleted, 0, 0)
            .composite(avatar.resize(191, 191), 122, 136);
            
        const res = await image.encodeJPEG();

        const attachment = new MessageAttachment("deleted.jpg", res);

        ctx.reply({files: [attachment]});
    }
}