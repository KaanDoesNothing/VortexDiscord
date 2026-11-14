import { RoleplayCommand } from "../../lib/structures/roleplay";

// /wink <member>: wink at someone, with a random GIF.
export class WinkCommand extends RoleplayCommand {
    protected readonly gif = "wink";
    public override applicationCommandData = this.define("wink", "Wink at someone");

    protected message(author: string, target: string) {
        return `${author} winked at ${target}`;
    }
}
