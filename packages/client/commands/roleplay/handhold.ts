import { RoleplayCommand } from "../../lib/structures/roleplay";

// /handhold <member>: hold someone's hand, with a random GIF.
export class HandholdCommand extends RoleplayCommand {
    protected readonly gif = "handhold";
    public override applicationCommandData = this.define("handhold", "Hold someone's hand");

    protected message(author: string, target: string) {
        return `${author} is holding ${target}'s hand`;
    }
}
