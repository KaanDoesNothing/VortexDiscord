import { RoleplayCommand } from "../../lib/structures/roleplay";

// /smile [member]: smile (at someone), with a random GIF.
export class SmileCommand extends RoleplayCommand {
    protected readonly gif = "smile";
    public override applicationCommandData = this.define("smile", "Smile (at someone)", false);

    protected message(author: string, target: string) {
        return `${author} is smiling at ${target}`;
    }

    protected override selfMessage(author: string) {
        return `${author} is smiling`;
    }
}
