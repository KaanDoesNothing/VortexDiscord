import { RoleplayCommand } from "../../lib/structures/roleplay";

// /bite <member>: give someone a playful bite, with a random GIF.
export class BiteCommand extends RoleplayCommand {
    protected readonly gif = "bite";
    public override applicationCommandData = this.define("bite", "Give someone a playful bite");

    protected message(author: string, target: string) {
        return `${author} bit ${target}`;
    }
}
