import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { pick } from "../../lib/economy";
import { VortexCommand } from "../../lib/structures/command";

const MOVES = { rock: "🪨", paper: "📄", scissors: "✂️" } as const;
type Move = keyof typeof MOVES;
const BEATS: Record<Move, Move> = { rock: "scissors", paper: "rock", scissors: "paper" };

// /rps <move>: rock, paper, scissors against the bot.
export class RpsCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, aliases: ["rockpaperscissors"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("rps")
        .setDescription("Play rock, paper, scissors against the bot")
        .addStringOption((o) => o.setName("move").setDescription("Your move").setRequired(true).addChoices(
            { name: "🪨 Rock", value: "rock" }, { name: "📄 Paper", value: "paper" }, { name: "✂️ Scissors", value: "scissors" }
        ));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const you = ctx.options.getString("move", true) as Move;
        const bot = pick(Object.keys(MOVES) as Move[]);
        const result = you === bot ? "It's a tie! 🤝" : BEATS[you] === bot ? "You win! 🎉" : "I win! 😎";

        return ctx.reply({ content: `${MOVES[you]} vs ${MOVES[bot]}: **${result}**` });
    }
}
