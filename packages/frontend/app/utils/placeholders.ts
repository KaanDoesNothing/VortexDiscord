// Example values for message previews in the dashboard (the bot fills in the real ones).
export const SAMPLE_VALUES: Record<string, string> = {
    "{user}": "vortexfan",
    "{user.name}": "Vortex Fan",
    "{user.mention}": "@Vortex Fan",
    "{user.id}": "123456789012345678",
    "{user.avatar}": "https://cdn.discordapp.com/embed/avatars/0.png",
    "{user.createdAt}": "3 years ago",
    "{user.joinedAt}": "just now",
    "{server}": "My Server",
    "{server.id}": "987654321098765432",
    "{server.icon}": "https://cdn.discordapp.com/embed/avatars/1.png",
    "{server.boosts}": "7",
    "{memberCount}": "1,234",
    "{channel}": "#general",
    "{date}": new Date().toLocaleDateString(),
    "{level}": "5",
    "{xp}": "1,550",
    "{inviter}": "@Friendly Inviter",
    "{inviter.invites}": "12",
    "{action}": "warn",
    "{reason}": "Spamming",
    "{duration}": "1h",
    "{args}": "some text"
};

// Fills placeholders with example values; {random:a|b} shows the first option.
export function fillSample(text: string, extra: Record<string, string> = {}) {
    const values = { ...SAMPLE_VALUES, ...extra };
    return text
        .replace(/\{random:([^{}]+)\}/g, (_, options: string) => options.split("|")[0] ?? "")
        .replace(/\{[\w.]+\}/g, (m) => values[m] ?? m);
}
