import {client} from "../../index";
import {Message} from "discord.js";
import argsParser from "yargs";
import {VortexCommand} from "../structures/Command";

export class optionsHandler extends Map {
    getUser(name: string) {
        return this.get(name);
    }

    getString(name: string) {
        return this.get(name);
    }

    getNumber(name: string) {
        return this.get(name);
    }
}

export class slashParser {
    private msg: Message;
    private cmd: VortexCommand;

    private errors = [];
    private missingArgs = [];
    private parsedArgs = [];

    public options = new optionsHandler();
    constructor(msg: Message, cmd: VortexCommand) {
        this.msg = msg;
        this.cmd = cmd;
    }

    async parseUser(argName: string, argValue: string) {
        try {
            const id = argValue.replaceAll("<", "").replaceAll(">", "").replaceAll("@", "");
            const user = await client.users.cache.get(id) || await client.users.fetch(id);

            this.options.set(argName, user);
        }catch(_err) {
            console.log(_err);
            this.errors.push("Invalid User");
        }
    }

    async exec() {
        const options = new optionsHandler();

        const args = argsParser(this.msg.content).argv;

        const cmdArgs = this.cmd.config.options;

        for (const i in cmdArgs) {
            const arg: any = cmdArgs[i];

            const passedArg = args[arg.name];
            if(!passedArg) {
                if(arg.required) {
                    this.missingArgs.push(arg.name);
                    continue;
                }else {
                    continue;
                }
            }

            console.log(arg.type);

            //Will improve this later!!!

            //Parse User
            if(arg.type === 6) {
                await this.parseUser(arg.name, passedArg)
            }

            //Parse String
            if(arg.type === 3) {
                this.options.set(arg.name, passedArg);
            }

            //Parse Number
            if(arg.type === 10) {
                if(!parseInt(passedArg)) this.missingArgs.push(arg.name);
                this.options.set(arg.name, passedArg);
            }
        }

        if(this.missingArgs.length > 0) {
            return {
                error: `Missing arguments: ${this.missingArgs.join(", ")}`
            }
        }

        return {
            client: client,
            reply: (content) => this.msg.reply(content as any),
            user: this.msg.author,
            guild: this.msg.guild,
            guildId: this.msg.guildId,
            channel: this.msg.channel,
            resolved: true,
            options: this.options
        }
    }
}