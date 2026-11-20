import { Command } from "@sapphire/framework";
import { SlashCommandBuilder, time } from "discord.js";
import { endLockdown, isLockedDown, lockdownEnds, startLockdown } from "../../lib/antiraid";
import { VortexCommand } from "../../lib/structures/command";
import { fail, info, ok } from "../../lib/structures/embed";

// /lockdown start|end|status: raid lockdown by hand. While on, the verification level is at its
// highest and anyone who joins is kicked with a "try again later" DM. It ends by itself.
export class LockdownCommand extends VortexCommand {
    constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, { ...options, requiredUserPermissions: ["ManageGuild"], requiredClientPermissions: ["ManageGuild", "KickMembers"], runIn: ["GUILD_ANY"] });
    }

    public override applicationCommandData = new SlashCommandBuilder()
        .setName("lockdown")
        .setDescription("Stop new members joining during a raid (kicks joiners until it ends)")
        .addSubcommand((s) => s.setName("start").setDescription("Start (or extend) a lockdown")
            .addIntegerOption((o) => o.setName("minutes").setDescription("How long (default 15)").setMinValue(1).setMaxValue(1440)))
        .addSubcommand((s) => s.setName("end").setDescription("End the lockdown now"))
        .addSubcommand((s) => s.setName("status").setDescription("Is the server locked down?"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const guild = ctx.guild!;
        switch (ctx.options.getSubcommand()) {
            case "start": {
                const minutes = ctx.options.getInteger("minutes") ?? 15;
                const { until } = await startLockdown(guild, minutes, ctx.user.id);
                return ctx.reply(ok(`🔒 Lockdown on until ${time(until, "t")} (${time(until, "R")}). New members are kicked with a message to try again later. End it with \`/lockdown end\`.`));
            }
            case "end":
                return ctx.reply(await endLockdown(guild) ? ok("🔓 Lockdown ended. The old verification level is back.") : fail("The server isn't locked down."));
            default:
                return ctx.reply(isLockedDown(guild.id) ? info(`🔒 Locked down until ${time(lockdownEnds(guild.id)!, "R")}.`) : info("🔓 Not locked down."));
        }
    }
}
