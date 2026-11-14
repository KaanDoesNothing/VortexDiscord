import { RoleplayCommand } from "../../lib/structures/roleplay";

// /slap <member>: slap someone, with a random GIF.
export class SlapCommand extends RoleplayCommand {
    protected readonly gif = "slap";
    public override applicationCommandData = this.define("slap", "Slap someone");

    protected message(author: string, target: string) {
        return `${author} slapped ${target}`;
    }
}
