import { RoleplayCommand } from "../../lib/structures/roleplay";

// /shrug [member]: shrug (at someone), with a random GIF.
export class ShrugCommand extends RoleplayCommand {
    protected readonly gif = "shrug";
    public override applicationCommandData = this.define("shrug", "Shrug (at someone)", false);

    protected message(author: string, target: string) {
        return `${author} shrugged at ${target}`;
    }

    protected override selfMessage(author: string) {
        return `${author} shrugged`;
    }
}
