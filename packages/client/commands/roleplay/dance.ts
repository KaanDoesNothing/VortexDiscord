import { RoleplayCommand } from "../../lib/structures/roleplay";

// /dance [member]: dance (with someone), with a random GIF.
export class DanceCommand extends RoleplayCommand {
    protected readonly gif = "dance";
    public override applicationCommandData = this.define("dance", "Dance (with someone)", false);

    protected message(author: string, target: string) {
        return `${author} is dancing with ${target}`;
    }

    protected override selfMessage(author: string) {
        return `${author} is dancing`;
    }
}
