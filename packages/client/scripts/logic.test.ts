// Unit tests for the pure logic behind settings, auto-mod, leveling, feeds, cron and autoresponders.
// No Discord or database needed: bun test scripts/logic.test.ts
import { describe, expect, test } from "bun:test";

// lib/database/client.ts refuses to load without a URL; nothing here connects.
Bun.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";

const { readSettings, resolveSettings, renderTemplate, DEFAULT_SETTINGS } = await import("../lib/settings");
const { findViolation } = await import("../lib/automod");
const { levelFromXp, xpForLevel, levelProgress } = await import("../lib/leveling");
const { parseFeed, newItems } = await import("../lib/feeds");
const { nextRun, parseCron } = await import("../lib/cron");
const { matches } = await import("../lib/autoresponders");

describe("settings", () => {
    test("old plain-string messages become rich messages", () => {
        const s = readSettings({ welcome: { enabled: true, message: "Hi {user}" } });
        expect(s.welcome.message).toEqual({ content: "Hi {user}", embed: { ...DEFAULT_SETTINGS.welcome.message.embed } });
        expect(s.welcome.enabled).toBe(true);
    });

    test("invalid values fall back and are reported", () => {
        const { settings, errors } = resolveSettings({ leveling: { xpMin: -5 }, branding: { color: "red" } });
        expect(errors.length).toBe(2);
        expect(settings.leveling.xpMin).toBe(15);
        expect(settings.branding.color).toBe("");
    });

    test("an embed-only message is valid, an empty one isn't", () => {
        expect(resolveSettings({ goodbye: { message: { content: "", embed: { enabled: true, title: "Bye" } } } }).errors).toEqual([]);
        expect(resolveSettings({ goodbye: { message: { content: "  " } } }).errors.length).toBe(1);
    });

    test("templates fill placeholders and {random:}", () => {
        const out = renderTemplate("{user.mention} {server} {reason} {random:a|a}", { user: { id: "1", username: "x" }, server: { name: "S", memberCount: 3 }, extra: { reason: "spam" } });
        expect(out).toBe("<@1> S spam a");
    });
});

describe("auto-mod", () => {
    const rules = { ...DEFAULT_SETTINGS.automod, enabled: true };
    const ctx = { mentionCount: 0, floodCount: 0, duplicateCount: 0 };

    test("whole-word blocking", () => {
        const r = { ...rules, blockedWords: ["ass"] };
        expect(findViolation("first class", r, ctx)).toBeNull();
        expect(findViolation("you ass", r, ctx)?.rule).toBe("words");
    });

    test("invites, phishing lookalikes, official links", () => {
        expect(findViolation("join discord.gg/abc", rules, ctx)?.rule).toBe("invites");
        expect(findViolation("free nitro https://dlscord-gift.ru/x", rules, ctx)?.rule).toBe("phishing");
        expect(findViolation("https://discord.com/channels/1/2", rules, ctx)).toBeNull();
    });

    test("caps, emoji, repeated characters, zalgo", () => {
        expect(findViolation("THIS IS VERY LOUD TEXT", { ...rules, caps: { enabled: true, percent: 70, minLength: 10 } }, ctx)?.rule).toBe("caps");
        expect(findViolation("Short OK", { ...rules, caps: { enabled: true, percent: 70, minLength: 10 } }, ctx)).toBeNull();
        expect(findViolation("😀😀😀😀", { ...rules, emoji: { enabled: true, max: 3 } }, ctx)?.rule).toBe("emoji");
        expect(findViolation("heeeeeeeeeeeeey", { ...rules, repeatedChars: { enabled: true, max: 10 } }, ctx)?.rule).toBe("repeatedChars");
        expect(findViolation("ź̂̃a", { ...rules, zalgo: true }, ctx)?.rule).toBe("zalgo");
    });

    test("floods and duplicates use the counts passed in", () => {
        expect(findViolation("hi", rules, { ...ctx, floodCount: 7 })?.rule).toBe("spam");
        expect(findViolation("hi", { ...rules, duplicates: { enabled: true, count: 3, seconds: 30 } }, { ...ctx, duplicateCount: 3 })?.rule).toBe("duplicates");
    });
});

describe("leveling", () => {
    test("curve matches the migration (5n² + 50n + 100 per level)", () => {
        expect(xpForLevel(1)).toBe(0);
        expect(xpForLevel(2)).toBe(155);
        expect(xpForLevel(3)).toBe(155 + 220);
        // Same formula the SQL migration used for level 10.
        const m = 9;
        expect(xpForLevel(10)).toBe((5 * m * (m + 1) * (2 * m + 1)) / 6 + 25 * m * (m + 1) + 100 * m);
    });

    test("level and progress from XP, with difficulty", () => {
        expect(levelFromXp(154)).toBe(1);
        expect(levelFromXp(155)).toBe(2);
        expect(levelFromXp(310, 200)).toBe(2);
        const p = levelProgress(200);
        expect(p.level).toBe(2);
        expect(p.current).toBe(45);
        expect(p.needed).toBe(220);
    });
});

describe("feeds", () => {
    const atom = `<feed><title>Chan</title>
        <entry><yt:videoId>v2</yt:videoId><title>Second &amp; newest</title><link rel="alternate" href="https://youtu.be/v2"/><author><name>Chan</name></author><published>2026-11-20T10:00:00Z</published></entry>
        <entry><yt:videoId>v1</yt:videoId><title>First</title><link rel="alternate" href="https://youtu.be/v1"/><author><name>Chan</name></author><published>2026-11-19T10:00:00Z</published></entry>
    </feed>`;

    test("parses Atom/YouTube", () => {
        const items = parseFeed(atom);
        expect(items.map((i) => i.id)).toEqual(["v2", "v1"]);
        expect(items[0]!.title).toBe("Second & newest");
        expect(items[0]!.url).toBe("https://youtu.be/v2");
    });

    test("parses RSS 2.0", () => {
        const rss = `<rss><channel><item><title><![CDATA[Hello]]></title><link>https://x.dev/a</link><guid>a</guid><pubDate>Fri, 20 Nov 2026 10:00:00 GMT</pubDate></item></channel></rss>`;
        expect(parseFeed(rss)).toMatchObject([{ id: "a", title: "Hello", url: "https://x.dev/a" }]);
    });

    test("only items newer than the last one seen, oldest first", () => {
        const items = parseFeed(atom);
        expect(newItems(items, "v1", null).map((i) => i.id)).toEqual(["v2"]);
        expect(newItems(items, "v2", null)).toEqual([]);
        expect(newItems(items, "gone", new Date("2026-11-19T12:00:00Z")).map((i) => i.id)).toEqual(["v2"]);
    });
});

describe("cron", () => {
    test("rejects bad schedules", () => {
        expect(() => parseCron("* * *")).toThrow();
        expect(() => parseCron("61 * * * *")).toThrow();
    });
    test("weekday mornings in a time zone", () => {
        expect(nextRun("0 9 * * 1-5", "Europe/Berlin", new Date("2026-11-20T10:30:00Z"))?.toISOString()).toBe("2026-11-23T08:00:00.000Z");
    });
});

describe("autoresponders", () => {
    test("match types", () => {
        expect(matches("hello there", "hello", "contains")).toBe(true);
        expect(matches("othello", "hello", "word")).toBe(false);
        expect(matches("Hello", "hello", "exact")).toBe(true);
        expect(matches("well hello", "hello", "startsWith")).toBe(false);
    });
});
