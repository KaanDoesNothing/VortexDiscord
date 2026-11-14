import { RoleplayCommand } from "../../lib/structures/roleplay";

// /facepalm [member]: facepalm (at someone), with a random GIF.
export class FacepalmCommand extends RoleplayCommand {
    protected readonly gif = "facepalm";
    public override applicationCommandData = this.define("facepalm", "Facepalm (at someone)", false);

    protected message(author: string, target: string) {
        return `${author} facepalmed at ${target}`;
    }

    protected override selfMessage(author: string) {
        return `${author} facepalmed`;
    }
}
