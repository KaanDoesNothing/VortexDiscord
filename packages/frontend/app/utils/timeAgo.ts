// "3 minutes ago" style relative time, using the browser's locale.
const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
    ["second", 1]
];

export function timeAgo(date: string | Date) {
    const seconds = (new Date(date).getTime() - Date.now()) / 1000;
    for (const [unit, size] of UNITS) {
        if (Math.abs(seconds) >= size || unit === "second") return rtf.format(Math.round(seconds / size), unit);
    }
    return "";
}
