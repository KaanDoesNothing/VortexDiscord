import { RoleplayCommand } from "../../lib/structures/roleplay";

// /punch <member>: throw a (pretend) punch at someone, with a random GIF.
export class PunchCommand extends RoleplayCommand {
    protected readonly gif = "punch";
    public override applicationCommandData = this.define("punch", "Throw a (pretend) punch at someone");

    protected message(author: string, target: string) {
        return `${author} punched ${target}`;
    }
}
