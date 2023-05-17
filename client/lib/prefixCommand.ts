import {ApplicationCommandOptionType, Message, User} from "harmony/mod.ts";
import argsParser from "npm:yargs";
import {VortexCommand} from "./Command.ts";
import {client} from "../index.ts";

export class prefixCommandHandler {
    private msg: Message;
    private command: VortexCommand;
    private readonly options: Map<string, User | string | number>;
    private errors: string[];
    constructor(msg: Message, command: VortexCommand) {
        this.msg = msg;
        this.command = command;
        this.options = new Map();
        this.errors = [];
    }

    async parseUser(argName: string, argValue: string) {
            try {
                const id = argValue.replaceAll("<", "").replaceAll(">", "").replaceAll("@", "");
                const user = await client.users.get(id) || await client.users.fetch(id);
                this.options.set(argName, user);
            }catch(_err) {
                console.log(_err);
                this.errors.push("Invalid User");
            }
    }

    parseString(argName: string, argValue: string) {
        this.options.set(argName, argValue);
    }

    parseNumber(argName: string, argValue: string) {
            if(parseInt(argValue)) {
                this.options.set(argName, parseInt(argValue));
            }else {
                this.errors.push("Invalid Number");
            }
    }

    async parse() {
        const options = new Map();
        const args = argsParser(this.msg.content).argv;

        for (const argName in args) {
            const argValue = args[argName];

            // console.log(`Parsing: ${argName} = ${argValue}`);

            const option = this.command.config.options.filter(row => row.name === argName)[0];
            // console.log(option);

            if(!option) continue;

            if(option.type === ApplicationCommandOptionType.USER) {
                await this.parseUser(argName, argValue);
            }else if(option.type === ApplicationCommandOptionType.STRING) {
                this.parseString(argName, argValue);
            }else if(option.type === ApplicationCommandOptionType.NUMBER) {
                this.parseNumber(argName, argValue);
            }else if(option.type === ApplicationCommandOptionType.INTEGER) {
                this.parseNumber(argName, argValue);
            }

            if(option.choices && this.options.has(argName)) {
                const choices: string[] = option.choices.map(choice => choice.value);

                if(!choices.includes(this.options.get(argName))) {
                    console.log("invalid", argName);
                    this.options.delete(argName);
                    this.errors.push(`Invalid argument for ${argName}(${choices.join(", ")})`);
                }
            }
        }

        if(this.options.size < this.command.config.options.filter(option => option.required).length) {
            this.errors.push(`Missing Arguments(${this.command.config.options.filter(option => !options.has(option.name) && option.required).map(option => option.name).join(", ")})`);
        }

        if(this.errors.length > 0) {
            return {error: `Errors: ${this.errors.join(", ")}`};
        }

        console.log(`Parsed`, this.options);

        return {
            client: client,
            data: {
                name: this.command.config.name
            },
            reply: (...content) => this.msg.reply(...content),
            user: this.msg.author,
            guild: this.msg.guild,
            guildID: this.msg.guildID,
            channel: this.msg.channel,
            channelID: this.msg.channel.id,
            resolved: true,
            option: (name: string) => {
                return this.options.get(name);
            }
        }
    }
}