import { RoleplayCommand } from "../../lib/structures/roleplay";

// /shoot <member>: shoot someone (it's just a GIF), with a random GIF.
export class ShootCommand extends RoleplayCommand {
    protected readonly gif = "shoot";
    public override applicationCommandData = this.define("shoot", "Shoot someone (it's just a GIF)");

    protected message(author: string, target: string) {
        return `${author} shot ${target}`;
    }
}
