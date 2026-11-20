import { container } from "@sapphire/framework";
import { GuildVerificationLevel, PermissionFlagsBits, time, type Guild, type GuildMember } from "discord.js";
import { eq } from "drizzle-orm";
import { SlidingWindow } from "./cooldowns";
import { DBManager } from "./database";
import { db } from "./database/client";
import { scheduledTasks } from "./database/schema";
import { cancelTask, registerTask, schedule } from "./scheduler";
import { Colors, VortexEmbed } from "./structures/embed";

// Raid protection (Dashboard → Moderation → Anti-raid).
//
// - Accounts younger than minAccountAgeDays are kicked on join.
// - More than `joins` members within `seconds` triggers a raid: an alert, and in lockdown mode the
//   server's verification level is raised to the highest and every new joiner is kicked until the
//   lockdown ends (after lockdownMinutes, or /lockdown end). The old verification level comes back.
// Lockdowns are scheduled tasks, so the end still happens after a restart.

const joins = new SlidingWindow(300_000);
// guildId → when the lockdown ends.
const active = new Map<string, { until: Date; taskId: number }>();

export const isLockedDown = (guildId: string) => (active.get(guildId)?.until.getTime() ?? 0) > Date.now();
export const lockdownEnds = (guildId: string) => active.get(guildId)?.until ?? null;

// Called for every new member before welcome messages. Returns true if the member was removed.
export async function screenNewMember(member: GuildMember): Promise<boolean> {
    if (member.user.bot) return false;
    const { settings } = await DBManager.getGuildConfig(member.guild.id);
    const rules = settings.antiRaid;
    if (!rules.enabled) return false;

    const guild = member.guild;
    const ageDays = (Date.now() - member.user.createdTimestamp) / 86_400_000;

    if (isLockedDown(guild.id)) {
        await removeJoiner(member, `This server is in lockdown because of a raid. Please try joining again ${time(lockdownEnds(guild.id)!, "R")}.`, "Anti-raid: lockdown");
        return true;
    }

    if (rules.minAccountAgeDays > 0 && ageDays < rules.minAccountAgeDays) {
        await removeJoiner(member, `Your account is too new to join **${guild.name}** (accounts must be at least ${rules.minAccountAgeDays} day${rules.minAccountAgeDays === 1 ? "" : "s"} old).`, "Anti-raid: account too new");
        return true;
    }

    const recent = joins.hit(guild.id, rules.seconds * 1000);
    if (recent > rules.joins) {
        // Reset so one raid triggers one alert.
        joins.clear(guild.id);
        await onRaid(guild, recent, rules.seconds, rules.action, rules.lockdownMinutes);
        if (rules.action === "lockdown") {
            await removeJoiner(member, `This server is in lockdown because of a raid. Please try joining again later.`, "Anti-raid: lockdown");
            return true;
        }
    }
    return false;
}

async function removeJoiner(member: GuildMember, dm: string, reason: string) {
    await member.send(dm).catch(() => null);
    if (member.kickable) await member.kick(reason).catch(() => null);
}

async function onRaid(guild: Guild, joinCount: number, seconds: number, action: "lockdown" | "alert", minutes: number) {
    const lockdown = action === "lockdown" ? await startLockdown(guild, minutes, container.client.user!.id).catch(() => null) : null;
    await alert(guild, new VortexEmbed(guild.id)
        .setColor(Colors.danger)
        .setTitle("🚨 Possible raid detected")
        .setDescription(`${joinCount} members joined within ${seconds} seconds.`)
        .addField("Action", lockdown
            ? `Lockdown until ${time(lockdown.until, "t")} (${time(lockdown.until, "R")}): verification level raised and new joiners are kicked. End it early with \`/lockdown end\`.`
            : action === "lockdown" ? "Couldn't start a lockdown (I need **Manage Server**)." : "Alert only (change this in the dashboard: Moderation → Anti-raid)."));
}

// Posts to the anti-raid alert channel, or the mod log channel.
export async function alert(guild: Guild, embed: VortexEmbed) {
    const { settings } = await DBManager.getGuildConfig(guild.id);
    const id = settings.antiRaid.alertChannelId ?? settings.modLog.channelId;
    const channel = id ? guild.channels.cache.get(id) : null;
    if (channel?.isSendable()) await channel.send({ embeds: [embed.setTimestamp()] }).catch(() => null);
}

// Raises the verification level and starts kicking new joiners. Returns when it ends.
export async function startLockdown(guild: Guild, minutes: number, startedBy: string) {
    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuild)) throw new Error("I need the Manage Server permission to lock the server down.");

    const until = new Date(Date.now() + minutes * 60_000);
    const existing = active.get(guild.id);
    let previousLevel = guild.verificationLevel;

    if (existing) {
        // Extending a lockdown keeps the level saved by the first one (the current one is VeryHigh).
        previousLevel = (await savedLevel(existing.taskId)) ?? GuildVerificationLevel.Low;
        await cancelTask(existing.taskId, guild.id);
    } else if (guild.verificationLevel !== GuildVerificationLevel.VeryHigh) {
        await guild.setVerificationLevel(GuildVerificationLevel.VeryHigh, "Anti-raid lockdown");
    }

    const taskId = await schedule({ type: "lockdown_end", guildId: guild.id, runAt: until, payload: { previousLevel }, createdBy: startedBy });
    active.set(guild.id, { until, taskId });
    return { until };
}

// The verification level a lockdown task will restore.
async function savedLevel(taskId: number) {
    const [task] = await db.select().from(scheduledTasks).where(eq(scheduledTasks.id, taskId)).limit(1);
    return (task?.payload as { previousLevel?: GuildVerificationLevel } | undefined)?.previousLevel ?? null;
}

// Ends a lockdown now and restores the old verification level. Returns false if there wasn't one.
export async function endLockdown(guild: Guild) {
    const lock = active.get(guild.id);
    if (!lock) return false;
    const level = (await savedLevel(lock.taskId)) ?? GuildVerificationLevel.Low;
    await cancelTask(lock.taskId, guild.id);
    await restore(guild, level);
    return true;
}

async function restore(guild: Guild, level: GuildVerificationLevel) {
    active.delete(guild.id);
    await guild.setVerificationLevel(level, "Anti-raid lockdown ended").catch(() => null);
    await alert(guild, new VortexEmbed(guild.id).setColor(Colors.success).setTitle("✅ Lockdown ended").setDescription("New members can join again."));
}

registerTask("lockdown_end", async (task) => {
    const guild = container.client.guilds.cache.get(task.guildId ?? "");
    if (guild) await restore(guild, (task.payload as { previousLevel: GuildVerificationLevel }).previousLevel);
});

// On startup: remember lockdowns that are still running.
export async function restoreLockdowns() {
    const rows = await db.select().from(scheduledTasks).where(eq(scheduledTasks.type, "lockdown_end"));
    for (const row of rows) if (row.guildId) active.set(row.guildId, { until: row.runAt, taskId: row.id });
}
