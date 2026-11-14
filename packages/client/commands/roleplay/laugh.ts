import { RoleplayCommand } from "../../lib/structures/roleplay";

// /laugh [member]: laugh (at someone), with a random GIF.
export class LaughCommand extends RoleplayCommand {
    protected readonly gif = "laugh";
    public override applicationCommandData = this.define("laugh", "Laugh (at someone)", false);

    protected message(author: string, target: string) {
        return `${author} is laughing at ${target}`;
    }

    protected override selfMessage(author: string) {
        return `${author} is laughing`;
    }
}
