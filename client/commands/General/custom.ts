import {ApplicationCommandInteraction, ApplicationCommandOptionType} from "harmony/mod.ts";
import {CustomCommand, VortexCommand} from "../../lib/Command.ts";
import {GuildTable} from "../../lib/Database.ts";

export class RunCustomCommand extends VortexCommand {
    initialize(): void {
        this.config = {
            name: "custom",
            description: "Custom cmd",
            options: [
                {
                    name: "source",
                    required: false,
                    description: "Nothing",
                    type: ApplicationCommandOptionType.STRING
                },
                {
                    name: "type",
                    required: false,
                    description: "Nothing",
                    type: ApplicationCommandOptionType.STRING
                },
                {
                    name: "name",
                    required: false,
                    description: "Nothing",
                    type: ApplicationCommandOptionType.STRING
                },
            ]
        }

        this.category = "General";
        this.hidden = true;
    }

    async exec(ctx: ApplicationCommandInteraction): Promise<void> {
        const type = ctx.option("type") as string;

        if(type === "create") {
            const name = ctx.option("name") as string;
            const source = ctx.option("source") as string;
            const parser = await (new CustomCommand().setGuild(ctx.guild.id).setAuthor(ctx.user)).parse(source);

            const guildData = await GuildTable.findOne({guild_id: ctx.guild.id});
            guildData.settings.custom.commands.push({
                name,
                source
            });

            await guildData.save();
        }else {
            const path = `${Deno.cwd()}/lib/commandTests/${ctx.option("source")}`;
            const file = await Deno.readTextFile(path);
            const parser = await (new CustomCommand().setGuild(ctx.guild.id).setAuthor(ctx.user)).parse(file);

            parser.forEach(action => {
                if(action.type === "embed") {
                    ctx.reply({embeds: [action.content]});
                }else if(action.type === "message") {
                    ctx.reply(action.content);
                }
            })
        }
    }
}