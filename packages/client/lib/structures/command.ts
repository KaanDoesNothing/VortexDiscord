import {Args, Command} from "@sapphire/framework";
import { Message, type SlashCommandOptionsOnlyBuilder} from "discord.js";
import { VortexEmbed } from "./embed";

export class VortexCommand extends Command {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options
        });
    }

    public permission_level = 0;

    public applicationCommandData!: SlashCommandOptionsOnlyBuilder;

    public override registerApplicationCommands(registry: Command.Registry) {
        if(this.applicationCommandData) registry.registerChatInputCommand(this.applicationCommandData);
    }

    public override async messageRun(message: Message, args: Args): Promise<any> {
        if(!this.applicationCommandData) return;

        const applicationCommandData = this.applicationCommandData.toJSON();

        console.log("Emulating:", applicationCommandData.name)

        const options = applicationCommandData.options;

        const emulatedData = new Map();
        const emulateOptions = {
            getMember: (name: string) => emulatedData.get(name),
            getString: (name: string) => emulatedData.get(name),
            getNumber: (name: string) => emulatedData.get(name),
            getInteger: (name: string) => emulatedData.get(name)
        }

        try {
            for (let i in options) {
                const option = options[i as any]!;

                if(option.type === 3) {
                    const arg = await args.pickResult("string");
                    if(!arg.isOk() && option.required) return message.reply({content: `Argument: ${option.name} is required.`});
                    if(!arg.isOk()) continue;

                    const val = arg.unwrap();
                    const choice = option.choices?.filter(choice => choice.value === val.toLowerCase() || choice.name.toLowerCase() === val.toLowerCase())[0];

                    if(option.choices && !choice) return message.reply({content: `Argument: ${option.name} | Choices: ${option.choices.map(choice => choice.name).join(', ')}`});

                    emulatedData.set(option.name, choice ? choice.value : val);
                }

                if(option.type === 4 || option.type === 10) {
                    const arg = await args.pickResult("integer");
                    if(!arg.isOk() && option.required) return message.reply(`Argument: ${option.name} is required.`);
                    if(!arg.isOk()) continue;

                    const val = arg.unwrap();

                    if(val < option.min_value! || val > option.max_value!) return message.reply({content: `Argument: ${option.name} | Number range: ${option.min_value} - ${option.max_value || "Infinite"}`});

                    emulatedData.set(option.name, val);
                }

                if(option.type === 6) {
                    const arg = await args.pickResult("member");
                    if(!arg.isOk() && option.required) return message.reply({content: `Argument: ${option.name} is required.`});
                    if(!arg.isOk()) continue;

                    const val = arg.unwrap();

                    emulatedData.set(option.name, val);
                }
            }

            const emulatedInput = {
                ...message,
                guild: message.guild,
                options: emulateOptions,
                user: message.author,
                member: message.member,
                reply: (args: any) => message.reply(args),
                isPollyFilled: true
            }

            //@ts-ignore
            if(this.chatInputRun) await this.chatInputRun(emulatedInput as any);
        }catch(err) {
            console.log(err)
            // return message.reply({content: err as any});
        }

        return;
    }

    async roleplayEmbed(type: string, title: string) {
        const res: any = await (await fetch(`https://nekos.best/api/v2/${type}`)).json();
        if(!res) return {content: "Error"};

        const embed = new VortexEmbed()
            .setTitle(title)
            .setImage(res.results[0].url)
            .setTimestamp();

        return {embeds: [embed]};
    }
}