import { RoleplayCommand } from "../../lib/structures/roleplay";

// /pat <member>: pat someone on the head, with a random GIF.
export class PatCommand extends RoleplayCommand {
    protected readonly gif = "pat";
    public override applicationCommandData = this.define("pat", "Pat someone on the head");

    protected message(author: string, target: string) {
        return `${author} patted ${target}`;
    }
}
