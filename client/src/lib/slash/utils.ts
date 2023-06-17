import {VortexCommand} from "../structures/Command";
import {argTypes} from "./polyfill";

export class usageParser {
    private cmd: VortexCommand;

    constructor(cmd: VortexCommand) {
        this.cmd = cmd;
    }

    exec() {
        return {
            slash: `${this.cmd.config.name} ${this.cmd.config.options.map((option: any) => `[${option.name}]`).join(" ")}`,
            prefix: `${this.cmd.config.name} ` + this.cmd.config.options.map((option: any) => {
                if(option.type === argTypes.user) {
                    return `--${option.name} @User`
                }else if(option.type === argTypes.string) {
                    return `--${option.name}="${option.choices ? option.choices.map(choice => choice.value).join(" | ") : "Text"}"`;
                }else if(option.type === argTypes.number) {
                    return `--${option.name} Number`;
                }
            }).join(" ")
        }
    }
}