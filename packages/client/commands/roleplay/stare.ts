import { RoleplayCommand } from "../../lib/structures/roleplay";

// /stare <member>: stare at someone, with a random GIF.
export class StareCommand extends RoleplayCommand {
    protected readonly gif = "stare";
    public override applicationCommandData = this.define("stare", "Stare at someone");

    protected message(author: string, target: string) {
        return `${author} is staring at ${target}`;
    }
}
