// Tiny in-memory TTL cache. The bot runs as a single process, so this is enough to avoid
// hitting Postgres on every message. Anything that writes the cached data must call delete().

export class TtlCache<T> {
    private readonly entries = new Map<string, { expires: number; value: Promise<T> }>();

    constructor(private readonly ttlMs: number) {}

    // Returns the cached value, or loads it. Concurrent callers share the same pending load.
    get(key: string, load: () => Promise<T>): Promise<T> {
        const hit = this.entries.get(key);
        if (hit && hit.expires > Date.now()) return hit.value;

        const value = load();
        this.entries.set(key, { expires: Date.now() + this.ttlMs, value });

        // Don't keep failed loads around, so the next call retries.
        value.catch(() => this.entries.delete(key));
        return value;
    }

    delete(key: string) {
        this.entries.delete(key);
    }
}

// Guild prefix / disabled commands / settings, keyed by guild ID.
export const guildCache = new TtlCache<any>(60_000);

// Custom commands per guild, keyed by guild ID.
export const customCommandCache = new TtlCache<any>(60_000);
