// Diagnoses the NodeLink connection on this machine without printing any secret values.
// Run from packages/client:  bun run check:music
//
// Checks: which Bun version is running, whether NODELINK_PASSWORD comes from .env or is being
// overridden by an environment variable (shell / PM2), whether the server accepts the password
// over HTTP, and whether the WebSocket connection (what the bot uses) is accepted.
import WebSocket from "ws";

const env = Bun.env;
const line = (label: string, value: string) => console.log(`${label.padEnd(26)} ${value}`);

line("Bun version", Bun.version);
line("Working directory", process.cwd());

// Read .env ourselves to see whether the running value is the one in the file.
const fileText = await Bun.file(".env").text().catch(() => null);
const fromFile = fileText
    ?.split(/\r?\n/)
    .find((l) => /^\s*NODELINK_PASSWORD\s*=/.test(l))
    ?.replace(/^\s*NODELINK_PASSWORD\s*=\s*/, "")
    .replace(/^(["'])(.*)\1$/, "$2")
    .trim();
const password = env.NODELINK_PASSWORD || "youshallnotpass";

line(".env file", fileText === null ? "NOT FOUND in this directory" : "found");
line("NODELINK_HOST", env.NODELINK_HOST ? "set" : "EMPTY (music off)");
line("NODELINK_PORT", env.NODELINK_PORT ?? "(default 3000)");
line("NODELINK_SECURE", env.NODELINK_SECURE ?? "false");
line("NODELINK_PASSWORD", env.NODELINK_PASSWORD ? `set (${env.NODELINK_PASSWORD.length} chars)` : "empty, using NodeLink default");
if (fromFile !== undefined && env.NODELINK_PASSWORD !== undefined) {
    line("Matches .env file", fromFile === env.NODELINK_PASSWORD
        ? "yes"
        : "NO - an environment variable (shell or PM2) is overriding .env");
}

if (!env.NODELINK_HOST) process.exit(1);

const secure = env.NODELINK_SECURE === "true";
const address = `${env.NODELINK_HOST}:${env.NODELINK_PORT ?? 3000}`;

// 1. HTTP: does the server accept the password?
try {
    const res = await fetch(`http${secure ? "s" : ""}://${address}/v4/info`, {
        headers: { Authorization: password },
        signal: AbortSignal.timeout(10_000)
    });
    line("HTTP /v4/info", res.status === 200 ? "200 OK - password accepted" : `${res.status} - ${res.status === 401 ? "password rejected" : "unexpected"}`);
} catch (error) {
    line("HTTP /v4/info", `failed: ${(error as Error).message}`);
}

// 2. WebSocket: the same handshake the bot does.
await new Promise<void>((resolve) => {
    const ws = new WebSocket(`ws${secure ? "s" : ""}://${address}/v4/websocket`, {
        headers: { Authorization: password, "User-Id": "123456789012345678", "Client-Name": "Vortex-check" }
    });
    const done = (text: string) => { line("WebSocket", text); ws.terminate(); resolve(); };
    ws.on("message", (raw) => done(`connected (op: ${JSON.parse(String(raw)).op})`));
    ws.on("unexpected-response", (_req, res) => done(`rejected with ${res.statusCode}${res.statusCode === 401 ? " - password not received or wrong" : ""}`));
    ws.on("error", (error) => done(`error: ${error.message}`));
    setTimeout(() => done("timed out"), 10_000);
});

process.exit(0);
