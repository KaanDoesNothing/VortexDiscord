// PM2 config for Vortex.
//   Build the frontend first: cd packages/frontend && bun install && bun run build
//   Start everything:         pm2 start ecosystem.config.cjs
//   Logs / status:            pm2 logs | pm2 status
//
// Both apps run on Bun in fork mode. PM2's cluster mode only works with Node,
// and the Discord client must run as a single process anyway.
//
// The bot's settings (token, DATABASE_URL, API_PORT, FRONTEND_URL, OAuth...) live in
// packages/client/.env, which Bun loads automatically. They're deliberately NOT set here:
// variables set by PM2 would silently override the .env file.

const path = require("node:path");

// Must match API_PORT in packages/client/.env (default 7805).
const API_PORT = 7805;
const FRONTEND_PORT = 7807;

module.exports = {
    apps: [
        {
            name: "vortex-client",
            cwd: path.join(__dirname, "packages/client"),
            script: "index.ts",
            interpreter: "bun",
            exec_mode: "fork",
            instances: 1,
            autorestart: true,
            max_memory_restart: "1G",
            // Wait a bit between crash restarts so a bad config doesn't hammer Discord's login.
            restart_delay: 5000,
            env: {
                NODE_ENV: "production"
            }
        },
        {
            name: "vortex-frontend",
            cwd: path.join(__dirname, "packages/frontend"),
            script: ".output/server/index.mjs",
            interpreter: "bun",
            exec_mode: "fork",
            instances: 1,
            autorestart: true,
            max_memory_restart: "512M",
            env: {
                NODE_ENV: "production",
                PORT: FRONTEND_PORT,
                // Where the dashboard's /api proxy forwards to. The browser never calls the bot directly,
                // so this can stay on localhost even in production.
                NUXT_API_URL: `http://localhost:${API_PORT}`
            }
        }
    ]
};
