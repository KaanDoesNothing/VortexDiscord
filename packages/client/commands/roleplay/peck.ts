import { RoleplayCommand } from "../../lib/structures/roleplay";

// /peck <member>: give someone a little peck on the cheek, with a random GIF.
export class PeckCommand extends RoleplayCommand {
    protected readonly gif = "peck";
    public override applicationCommandData = this.define("peck", "Give someone a little peck on the cheek");

    protected message(author: string, target: string) {
        return `${author} gave ${target} a peck`;
    }
}
