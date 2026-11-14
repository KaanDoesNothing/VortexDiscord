import { RoleplayCommand } from "../../lib/structures/roleplay";

// /sleep [member]: fall asleep (next to someone), with a random GIF.
export class SleepCommand extends RoleplayCommand {
    protected readonly gif = "sleep";
    public override applicationCommandData = this.define("sleep", "Fall asleep (next to someone)", false);

    protected message(author: string, target: string) {
        return `${author} fell asleep next to ${target}`;
    }

    protected override selfMessage(author: string) {
        return `${author} fell asleep`;
    }
}
