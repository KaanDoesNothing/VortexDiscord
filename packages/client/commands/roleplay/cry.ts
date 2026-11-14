import { RoleplayCommand } from "../../lib/structures/roleplay";

// /cry [member]: cry (on someone's shoulder), with a random GIF.
export class CryCommand extends RoleplayCommand {
    protected readonly gif = "cry";
    public override applicationCommandData = this.define("cry", "Cry (on someone's shoulder)", false);

    protected message(author: string, target: string) {
        return `${author} is crying on ${target}'s shoulder`;
    }

    protected override selfMessage(author: string) {
        return `${author} is crying`;
    }
}
