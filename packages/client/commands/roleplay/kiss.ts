import { RoleplayCommand } from "../../lib/structures/roleplay";

// /kiss <member>: give someone a kiss, with a random GIF.
export class KissCommand extends RoleplayCommand {
    protected readonly gif = "kiss";
    public override applicationCommandData = this.define("kiss", "Give someone a kiss");

    protected message(author: string, target: string) {
        return `${author} kissed ${target}`;
    }
}
