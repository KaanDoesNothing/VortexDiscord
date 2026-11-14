import { RoleplayCommand } from "../../lib/structures/roleplay";

// /think [member]: think really hard (about someone), with a random GIF.
export class ThinkCommand extends RoleplayCommand {
    protected readonly gif = "think";
    public override applicationCommandData = this.define("think", "Think really hard (about someone)", false);

    protected message(author: string, target: string) {
        return `${author} is thinking about ${target}`;
    }

    protected override selfMessage(author: string) {
        return `${author} is thinking`;
    }
}
