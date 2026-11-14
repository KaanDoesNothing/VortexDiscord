import { RoleplayCommand } from "../../lib/structures/roleplay";

// /happy [member]: be happy (with someone), with a random GIF.
export class HappyCommand extends RoleplayCommand {
    protected readonly gif = "happy";
    public override applicationCommandData = this.define("happy", "Be happy (with someone)", false);

    protected message(author: string, target: string) {
        return `${author} is happy with ${target}`;
    }

    protected override selfMessage(author: string) {
        return `${author} is happy`;
    }
}
