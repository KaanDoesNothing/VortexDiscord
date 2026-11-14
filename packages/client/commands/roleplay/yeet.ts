import { RoleplayCommand } from "../../lib/structures/roleplay";

// /yeet <member>: yeet someone into the sky, with a random GIF.
export class YeetCommand extends RoleplayCommand {
    protected readonly gif = "yeet";
    public override applicationCommandData = this.define("yeet", "Yeet someone into the sky");

    protected message(author: string, target: string) {
        return `${author} yeeted ${target}`;
    }
}
