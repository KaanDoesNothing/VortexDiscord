import { RoleplayCommand } from "../../lib/structures/roleplay";

// /cuddle <member>: cuddle up with someone, with a random GIF.
export class CuddleCommand extends RoleplayCommand {
    protected readonly gif = "cuddle";
    public override applicationCommandData = this.define("cuddle", "Cuddle up with someone");

    protected message(author: string, target: string) {
        return `${author} cuddled ${target}`;
    }
}
