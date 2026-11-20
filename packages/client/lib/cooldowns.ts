// In-memory cooldowns keyed by any string ("guild:user", "guild:channel:trigger"...).
// Expired entries are swept on a timer, so memory stays bounded without ever wiping
// everyone's state at once (the old approach of clear()-ing a full map reset flood
// detection right in the middle of a raid).
export class Cooldowns {
    private readonly until = new Map<string, number>();

    constructor(sweepEveryMs = 60_000) {
        setInterval(() => this.sweep(), sweepEveryMs).unref();
    }

    // Starts the cooldown and returns true if the key was free; returns false while it's still running.
    take(key: string, ms: number) {
        const now = Date.now();
        if ((this.until.get(key) ?? 0) > now) return false;
        this.until.set(key, now + ms);
        return true;
    }

    // When the key is usable again (0 = now).
    readyAt(key: string) {
        return this.until.get(key) ?? 0;
    }

    set(key: string, ms: number) {
        this.until.set(key, Date.now() + ms);
    }

    delete(key: string) {
        this.until.delete(key);
    }

    private sweep() {
        const now = Date.now();
        for (const [key, t] of this.until) if (t <= now) this.until.delete(key);
    }
}

// Timestamps of recent events per key (e.g. messages per user) within a sliding window, swept the same way.
export class SlidingWindow {
    private readonly events = new Map<string, number[]>();

    constructor(private readonly maxWindowMs: number, sweepEveryMs = 60_000) {
        setInterval(() => this.sweep(), sweepEveryMs).unref();
    }

    // Records an event now and returns how many happened within the last windowMs (including this one).
    hit(key: string, windowMs: number) {
        const now = Date.now();
        const list = (this.events.get(key) ?? []).filter((t) => t > now - windowMs);
        list.push(now);
        this.events.set(key, list);
        return list.length;
    }

    clear(key: string) {
        this.events.delete(key);
    }

    private sweep() {
        const cutoff = Date.now() - this.maxWindowMs;
        for (const [key, list] of this.events) {
            const kept = list.filter((t) => t > cutoff);
            if (kept.length) this.events.set(key, kept);
            else this.events.delete(key);
        }
    }
}
