// Minimal 5-field cron ("minute hour day-of-month month day-of-week") for scheduled announcements,
// evaluated in an IANA time zone (e.g. "Europe/Berlin"), so "0 9 * * 1-5" means 9:00 local time on
// weekdays, including across daylight-saving changes.
//
// Supports *, numbers, lists (1,15), ranges (1-5) and steps (*/15, 0-30/10). Day of week: 0-6, Sunday = 0
// (7 also means Sunday). Like standard cron, if both day fields are restricted, either may match.

interface Cron { minute: Set<number>; hour: Set<number>; dom: Set<number>; month: Set<number>; dow: Set<number>; domAny: boolean; dowAny: boolean }

const FIELDS: [name: string, min: number, max: number][] = [["minute", 0, 59], ["hour", 0, 23], ["day of month", 1, 31], ["month", 1, 12], ["day of week", 0, 7]];

function parseField(text: string, [name, min, max]: [string, number, number]): Set<number> {
    const out = new Set<number>();
    for (const part of text.split(",")) {
        const match = part.match(/^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/);
        if (!match) throw new Error(`Invalid ${name}: "${part}"`);
        const [, range, stepText] = match;
        const step = stepText ? Number(stepText) : 1;
        let [from, to] = range === "*" ? [min, max] : range!.split("-").map(Number) as [number, number?];
        to ??= stepText ? max : from;
        if (from < min || to > max || from > to || step < 1) throw new Error(`Invalid ${name}: "${part}" (allowed ${min}-${max})`);
        for (let v = from; v <= to; v += step) out.add(name === "day of week" && v === 7 ? 0 : v);
    }
    return out;
}

export function parseCron(expression: string): Cron {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) throw new Error("A schedule needs 5 parts: minute hour day month weekday (e.g. \"0 9 * * 1-5\")");
    const [minute, hour, dom, month, dow] = parts.map((p, i) => parseField(p, FIELDS[i]!)) as [Set<number>, Set<number>, Set<number>, Set<number>, Set<number>];
    return { minute, hour, dom, month, dow, domAny: parts[2] === "*", dowAny: parts[4] === "*" };
}

export function isValidTimeZone(tz: string) {
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
    } catch {
        return false;
    }
}

// Wall-clock parts of a moment in a time zone.
function partsIn(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", weekday: "short" })
        .formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)!.value;
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return { month: Number(get("month")), day: Number(get("day")), hour: Number(get("hour")), minute: Number(get("minute")), dow: weekdays.indexOf(get("weekday")) };
}

// The next time (strictly after `after`) the schedule fires, or null if none within a year.
export function nextRun(expression: string, timeZone = "UTC", after = new Date()): Date | null {
    const cron = parseCron(expression);
    // Start at the next whole minute.
    let t = Math.floor(after.getTime() / 60_000) * 60_000 + 60_000;
    const limit = t + 366 * 86_400_000;

    while (t < limit) {
        const p = partsIn(new Date(t), timeZone);
        const dayOk = cron.domAny && cron.dowAny ? true
            : cron.domAny ? cron.dow.has(p.dow)
                : cron.dowAny ? cron.dom.has(p.day)
                    : cron.dom.has(p.day) || cron.dow.has(p.dow);

        if (!cron.month.has(p.month) || !dayOk) { t += (24 * 60 - p.hour * 60 - p.minute) * 60_000; continue; } // next day
        if (!cron.hour.has(p.hour)) { t += (60 - p.minute) * 60_000; continue; } // next hour
        if (cron.minute.has(p.minute)) return new Date(t);
        t += 60_000;
    }
    return null;
}
