import { RoleplayCommand } from "../../lib/structures/roleplay";

// /blush [member]: blush (at someone), with a random GIF.
export class BlushCommand extends RoleplayCommand {
    protected readonly gif = "blush";
    public override applicationCommandData = this.define("blush", "Blush (at someone)", false);

    protected message(author: string, target: string) {
        return `${author} is blushing because of ${target}`;
    }

    protected override selfMessage(author: string) {
        return `${author} is blushing`;
    }
}
