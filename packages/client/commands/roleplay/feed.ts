import { RoleplayCommand } from "../../lib/structures/roleplay";

// /feed <member>: feed someone something tasty, with a random GIF.
export class FeedCommand extends RoleplayCommand {
    protected readonly gif = "feed";
    public override applicationCommandData = this.define("feed", "Feed someone something tasty");

    protected message(author: string, target: string) {
        return `${author} fed ${target}`;
    }
}
