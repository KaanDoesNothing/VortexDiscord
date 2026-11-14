import { RoleplayCommand } from "../../lib/structures/roleplay";

// /hug <member>: give someone a warm hug, with a random GIF.
export class HugCommand extends RoleplayCommand {
    protected readonly gif = "hug";
    public override applicationCommandData = this.define("hug", "Give someone a warm hug");

    protected message(author: string, target: string) {
        return `${author} hugged ${target}`;
    }
}
