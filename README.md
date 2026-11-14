# Vortex

A Discord bot with 140+ commands (music, moderation, auto-mod, economy games, leveling, giveaways, tickets, lookups and more) and a web dashboard where server admins configure everything.

Finished with AI and updated because I don't have the motivation for this project, but people are still using it.

- **Bot**: [packages/client](packages/client/): [discord.js](https://discord.js.org) + [Sapphire](https://sapphirejs.dev), PostgreSQL via [Drizzle](https://orm.drizzle.team)
- **Dashboard**: [packages/frontend](packages/frontend/): [Nuxt 4](https://nuxt.com) + [Tailwind CSS 4](https://tailwindcss.com)
- **Runtime**: [Bun](https://bun.sh) for both, [PM2](https://pm2.keymetrics.io) in production

## Contents

- [Features](#features)
- [Setup](#setup)
- [Running in production](#running-in-production)
- [Commands](#commands)
- [Dashboard](#dashboard)
- [Project layout](#project-layout)
- [Development guide](#development-guide)
- [Troubleshooting](#troubleshooting)

## Features

**Moderation**
- Commands: warn, timeout, kick, ban, **temporary bans** that lift themselves, unban, lock and unlock channels, slowmode, purge (optionally one user's messages), and private **mod notes**.
- Role hierarchy is respected: moderators can't act on people ranked at or above them.
- Everything is logged to a mod-log channel and the dashboard.
- **Warning punishments**, e.g. 3 warns → 1 hour timeout, 5 → kick.
- **Ban appeals**: a DM with your appeal link, sent before the ban.
- **Event logs**: deleted and edited messages, joins and leaves (with account age), role and nickname changes, voice activity.

**Auto-mod**
- Blocked words (whole words or phrases), Discord invites, other links (with an allow-list), mass mentions and message floods.
- Punishment is a delete, a warn or a timeout, with role and channel exemptions.
- Edited messages are checked too.

**Music** (via [NodeLink](https://github.com/PerformanC/NodeLink), a Lavalink-compatible audio server)
- Play songs and playlists from YouTube, YouTube Music, SoundCloud, Spotify, Deezer, Apple Music, Bandcamp, Twitch and more, or search and pick from the results.
- A "Now playing" card with buttons: previous, pause, skip, stop, loop, shuffle and volume.
- Commands: queue (with pages), skip to a song, previous, seek, loop (song or queue), shuffle, remove, move, clear, volume, **lyrics** and **autoplay** (keeps playing related songs).
- **Audio effects**: bass boost, nightcore, vaporwave, 8D, karaoke, low-pass, tremolo, vibrato, EQ presets and a speed setting.
- **DJ roles**: only DJs can skip other people's songs, stop, change volume and so on. People can always skip or remove their own songs, and someone alone with the bot can control it.
- Queue limits per server and per member, a default and maximum volume, and auto-leave when the queue ends or everyone leaves. **24/7 mode** keeps the bot in voice.
- The dashboard has a **live player**: now playing, a seek bar, controls, volume, and a queue you can reorder.

**Economy and games**
- Global wallet plus a **bank** that `/rob` can't touch.
- Earning: `/daily` with streak bonuses, `/weekly`, `/work`, `/beg`, `/crime`, `/rob`, `/pay`, `/leaderboard`.
- Games: **blackjack** (buttons), **slots**, **high/low**, coinflip, dice and trivia. Payouts are tuned so the house keeps a small edge and coins can't be farmed.
- Every balance change is atomic, so spamming commands can't duplicate coins.

**Engagement**
- **Leveling** with rank cards, role rewards at chosen levels, a cooldown, ignored channels and level-up messages.
- **Welcome and goodbye** messages, with optional generated welcome cards, plus auto-roles.
- **Role panels**: messages with buttons members click to give themselves roles.
- **Starboard**, **giveaways** (they end on time even across restarts), **polls** with live result bars, and **birthday** announcements.

**Utility**
- **Tickets**: private support channels with staff roles and text transcripts.
- **Suggestions** with voting and staff review.
- **Reminders**, **scheduled or repeating announcements**, an **embed builder**, and **custom commands** with placeholders.

**Lookup, news and tools**
- Lookup: weather, Wikipedia, dictionary, crypto prices, currency exchange, GitHub, npm, anime and manga, and world time.
- News: Hacker News headlines and topic search, and "on this day" in history.
- Tools: a safe calculator, color previews, Base64, hashing, QR codes, Discord timestamps, choose and random.

**Fun and roleplay**
- Jokes, facts, memes (NSFW filtered), cats, dogs, rock-paper-scissors, ship, rate, the 8-ball, and avatar memes.
- 30 roleplay GIF commands.

**Configuration**
- Disable any command, or limit it to certain roles or channels with a per-command cooldown.
- Choose which channels commands work in, set a custom prefix, rename the currency, and use `/settings` for quick changes.
- Changes made in the dashboard are recorded in an **audit log**.

**Website**
- A home page and a **live stats page** (shards, ping, usage over the last 24 hours, top commands, system).
- A full per-server **dashboard** (see [Dashboard](#dashboard)).

## Setup

### 1. Requirements

- [Bun](https://bun.sh) 1.2 or newer: `powershell -c "irm bun.sh/install.ps1 | iex"` (Windows) or `curl -fsSL https://bun.sh/install | bash`
- PostgreSQL 14 or newer (local, Docker, or a hosted one such as Neon or Supabase)
- A Discord application from the [Developer Portal](https://discord.com/developers/applications)

No API keys are needed: lookup commands only use free public APIs.

### 2. Create the Discord application

1. In the [Developer Portal](https://discord.com/developers/applications), click **New Application**.
2. Go to **Bot** → **Reset Token** and copy the token. This is `DISCORD_TOKEN`.
3. Still under **Bot**, enable **Message Content Intent**. Prefix commands and auto-mod need it.
4. *Optional:* enable **Server Members Intent** for welcome/goodbye messages, auto-roles, the joins/leaves and roles logs, and the growth chart (see [step 5](#5-optional-server-members-features)).
5. Go to **OAuth2**:
   - Copy the **Client ID** and **Client Secret**. These are `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`, for dashboard login. They must come from **this same application**.
   - Under **Redirects**, add `http://localhost:7807/oauth/callback`, or `https://your-domain/oauth/callback` in production.
6. Invite the bot. Once it's running, `/invite` and the dashboard's "Add bot" buttons give a link with exactly the permissions it needs.

### 3. Create the database

Create an empty database. With `psql`:

```sql
CREATE USER vortex WITH PASSWORD 'choose-a-password';
CREATE DATABASE vortex OWNER vortex;
```

Or with Docker:

```bash
docker run -d --name vortex-db -p 5432:5432 -e POSTGRES_USER=vortex -e POSTGRES_PASSWORD=choose-a-password -e POSTGRES_DB=vortex postgres:17
```

You don't need to create any tables. The bot creates and updates them itself every time it starts.

### 4. Configure and install

```bash
cd packages/client
cp .env.example .env      # then fill it in
bun install

cd ../frontend
bun install
```

`packages/client/.env`:

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot token from step 2 |
| `DATABASE_URL` | ✅ | `postgres://user:password@host:5432/database` |
| `API_PORT` | | Port for the bot's API. Default `7805` |
| `FRONTEND_URL` | | Public URL of the dashboard. Default `http://localhost:7807`. Must match the OAuth redirect |
| `DISCORD_CLIENT_ID` | for dashboard | OAuth2 client ID (same app as the bot) |
| `DISCORD_CLIENT_SECRET` | for dashboard | OAuth2 client secret |
| `DISCORD_MEMBERS_INTENT` | | `true` to enable the Server Members features. Default `false` |
| `NODELINK_HOST` | for music | NodeLink (or Lavalink v4) server address. Empty = music off |
| `NODELINK_PORT` | | Default `3000` (NodeLink's default) |
| `NODELINK_PASSWORD` | | The server password. Default `youshallnotpass` (NodeLink's default) |
| `NODELINK_SECURE` | | `true` if the server uses https/wss |
| `NODELINK_TYPE` | | `nodelink` (default) or `lavalink` |
| `OWNER_IDS` | | Extra bot-owner user IDs, comma-separated. The application's owner (or its team) is always an owner |

> Without `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`, the bot and the public pages still work; the dashboard just can't log anyone in.

The frontend needs no `.env` for local use. To point it at a bot API somewhere other than `http://localhost:7805`, set `NUXT_API_URL`.

### 5. (Optional) Server Members features

Welcome and goodbye messages, auto-roles, welcome cards, the joins/leaves and roles event logs, and the dashboard's growth chart all need Discord's privileged **Server Members** intent:

1. Developer Portal → **Bot** → **Privileged Gateway Intents** → enable **Server Members Intent**.
2. Set `DISCORD_MEMBERS_INTENT=true` in `.env` and restart the bot.

Do step 1 before step 2. If the bot asks for the intent without it being enabled in the portal, Discord refuses the login. Bots in 100 or more servers also need Discord's approval for this intent.

### 6. (Optional) Music with NodeLink

Music needs a separate audio server. [NodeLink](https://github.com/PerformanC/NodeLink) is a Lavalink v4-compatible server. A standard [Lavalink](https://lavalink.dev) v4 server also works; set `NODELINK_TYPE=lavalink`.

```bash
git clone https://github.com/PerformanC/NodeLink.git && cd NodeLink
npm install                       # or: bun install
cp config.default.ts config.ts    # set server.password (and Spotify/Deezer keys if you want those sources)
npm run start                     # or: bun run start:bun   (needs Node >= 22.22 or Bun)
```

Or with Docker: `docker run -d -p 3000:3000 ghcr.io/performanc/nodelink:latest`.

Then set these in `packages/client/.env` and restart the bot:

```
NODELINK_HOST=127.0.0.1
NODELINK_PORT=3000
NODELINK_PASSWORD=the-password-from-config.ts
```

Without `NODELINK_HOST`, music commands reply that music isn't set up, and everything else works normally.

### 7. Run it

Use two terminals:

```bash
# Terminal 1: the bot + API (port 7805)
cd packages/client
bun run dev          # restarts on file changes; use `bun start` for a plain run

# Terminal 2: the dashboard (port 7807)
cd packages/frontend
bun run dev
```

Open <http://localhost:7807>, click **Log in**, and pick a server.

The first start creates the database tables and registers the slash commands with Discord. Global slash commands can take a few minutes to appear the first time.

## Running in production

[ecosystem.config.cjs](ecosystem.config.cjs) runs both apps with PM2:

```bash
npm install -g pm2                              # once
cd packages/frontend && bun run build && cd ../..
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup                         # start again after reboots
```

Useful commands: `pm2 status`, `pm2 logs vortex-client`, `pm2 restart vortex-frontend`.

After pulling updates, run `bun install` in both packages, rebuild the frontend, then `pm2 restart all`. Database changes apply automatically when the bot starts.

**Behind a domain:** only the dashboard (port 7807) needs to be public. It proxies `/api/*` to the bot internally, so port 7805 can stay firewalled. Example nginx config:

```nginx
server {
    server_name vortex.example.com;
    location / {
        proxy_pass http://127.0.0.1:7807;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then set `FRONTEND_URL=https://vortex.example.com` in `packages/client/.env`, and add `https://vortex.example.com/oauth/callback` as a redirect in the Developer Portal. Use HTTPS in production: the login cookie is marked `Secure` when `NODE_ENV=production`.

## Commands

Every command works as a slash command or with the server's prefix (default `->`, changeable with `/prefix` or the dashboard). `<required>` and `[optional]` arguments are shown. Commands with subcommands are shown as `<a|b|c>`. Server admins can turn any command off, or limit it to roles or channels.

<details open>
<summary><b>General</b> (5)</summary>

| Command | What it does | Permission |
|---|---|---|
| `/help [command]` | List every command, or get details and usage for one | Everyone |
| `/invite` | Add the bot to your own server | Everyone |
| `/ping` | Check how fast the bot is responding | Everyone |
| `/stats` | Bot statistics: servers, users, memory, uptime and more | Everyone |
| `/uptime` | How long the bot has been online | Everyone |

</details>

<details>
<summary><b>Information</b> (9)</summary>

| Command | What it does | Permission |
|---|---|---|
| `/avatar [user]` | Show someone's avatar in full size | Everyone |
| `/banner [user]` | Show someone's profile banner | Everyone |
| `/channelinfo [channel]` | Details about a channel: type, topic, slowmode, creation date | Everyone |
| `/emojis` | Show all of this server's custom emojis | Everyone |
| `/membercount` | How many members this server has, and how many are online | Everyone |
| `/roleinfo <role>` | Details about a role: color, members, key permissions | Everyone |
| `/roles` | List all of this server's roles, highest first | Everyone |
| `/serverinfo` | Owner, member count, channels, boosts and more about this server | Everyone |
| `/userinfo [user]` | Account age, join date and roles for a user | Everyone |

</details>

<details>
<summary><b>Lookup</b> (9)</summary>

| Command | What it does | Permission |
|---|---|---|
| `/anime <title> [type]` | Look up an anime or manga: score, episodes, genres and synopsis | Everyone |
| `/crypto <coin> [currency]` | Live price and 24h change for a cryptocurrency | Everyone |
| `/define <word>` | Look up the meaning of an English word | Everyone |
| `/exchange <amount> <from> <to>` | Convert between real-world currencies, e.g. 100 USD to EUR | Everyone |
| `/github <query>` | Look up a GitHub repository (owner/repo) or user | Everyone |
| `/npm <package>` | Look up a JavaScript package on npm | Everyone |
| `/time <place>` | What time is it in another city or time zone? | Everyone |
| `/weather <place> [units]` | Current weather and a 3-day forecast for any city | Everyone |
| `/wiki <topic>` | Look up a topic on Wikipedia | Everyone |

</details>

<details>
<summary><b>News</b> (2)</summary>

| Command | What it does | Permission |
|---|---|---|
| `/news [feed] [topic]` | Tech news headlines from Hacker News, or search for a topic | Everyone |
| `/onthisday [type]` | What happened on this day in history | Everyone |

</details>

<details>
<summary><b>Tools</b> (8)</summary>

| Command | What it does | Permission |
|---|---|---|
| `/base64 <encode|decode>` | Encode or decode Base64 text | Everyone |
| `/calc <expression>` | Calculate a math expression, e.g. (2+3)*4, sqrt(16), 2^10, sin(pi/2) | Everyone |
| `/choose <options>` | Can't decide? Let the bot pick one of your options | Everyone |
| `/color <color>` | Preview a color and get its HEX, RGB and HSL values | Everyone |
| `/hash <text> [algorithm]` | Hash text with MD5, SHA-1, SHA-256 or SHA-512 | Everyone |
| `/qr <text>` | Turn a link or text into a QR code | Everyone |
| `/random [min] [max] [count]` | Get random numbers in a range (default 1-100) | Everyone |
| `/timestamp <when>` | Make a timestamp that shows in everyone's own time zone | Everyone |

</details>

<details>
<summary><b>Fun</b> (14)</summary>

| Command | What it does | Permission |
|---|---|---|
| `/8ball <question>` | Ask the magic 8-ball a yes-or-no question | Everyone |
| `/cat` | A random cat picture 🐱 | Everyone |
| `/delete [user]` | Put someone's avatar in the trash with a fake "Delete this?" dialog | Everyone |
| `/dog [breed]` | A random dog picture 🐶 | Everyone |
| `/door [user]` | Show someone peeking out from behind a mysterious door | Everyone |
| `/fact` | Learn a random fun fact | Everyone |
| `/joke [category]` | Tell a random (clean) joke | Everyone |
| `/meme [from]` | A random meme from Reddit | Everyone |
| `/rate <thing>` | Let the bot rate anything out of 10 | Everyone |
| `/rps <move>` | Play rock, paper, scissors against the bot | Everyone |
| `/ship <user> [user2]` | How compatible are two people? A totally scientific love meter | Everyone |
| `/triggered [user]` | Slap a TRIGGERED banner on someone's avatar | Everyone |
| `/trivia [difficulty]` | Answer a trivia question; get it right to win coins | Everyone |
| `/wasted [user]` | Give someone's avatar the GTA-style WASTED screen | Everyone |

</details>

<details open>
<summary><b>Music</b> (21)</summary>

| Command | What it does | Permission |
|---|---|---|
| `/247` | Stay in voice 24/7, even when idle or alone (Manage Server) | Manage Server |
| `/autoplay` | Keep playing related songs when the queue runs out | Everyone |
| `/clear [mine]` | Clear the upcoming songs (the current song keeps playing) | Everyone |
| `/filter <effect> [speed]` | Add an audio effect: bass boost, nightcore, 8D, karaoke and more | Everyone |
| `/loop [mode]` | Loop the current song or the whole queue | Everyone |
| `/lyrics` | Show the lyrics of the current song | Everyone |
| `/move <from> <to>` | Move a song to a different place in the queue | Everyone |
| `/nowplaying` | Show the current song with playback controls | Everyone |
| `/pause` | Pause the music | Everyone |
| `/play <query> [source] [next]` | Play a song or playlist from a link or a search | Everyone |
| `/previous` | Go back and play the previous song again | Everyone |
| `/queue [page]` | See what's playing and what's coming up | Everyone |
| `/remove <position>` | Remove a song from the queue | Everyone |
| `/resume` | Resume paused music | Everyone |
| `/search <query> [source]` | Search for songs and pick which ones to queue | Everyone |
| `/seek <time>` | Jump to a time in the current song, e.g. 1:30, or +30 / -10 seconds | Everyone |
| `/shuffle` | Shuffle the upcoming songs | Everyone |
| `/skip` | Skip the current song | Everyone |
| `/skipto <position>` | Jump to a song in the queue, skipping the ones before it | Everyone |
| `/stop` | Stop the music, clear the queue and leave voice | Everyone |
| `/volume [level]` | Show or change the music volume | Everyone |

</details>

<details>
<summary><b>Economy</b> (16)</summary>

| Command | What it does | Permission |
|---|---|---|
| `/balance [member]` | Check your wallet and bank, or someone else's | Everyone |
| `/beg` | Beg strangers for a few coins (might not work) | Everyone |
| `/blackjack <bet>` | Play blackjack against the dealer: get closer to 21 without going over | Everyone |
| `/coinflip <side> <amount>` | Bet coins on a coin flip: guess right and double your bet | Everyone |
| `/crime` | Commit a (harmless) crime: big payout, or a fine if you get caught | Everyone |
| `/daily` | Claim free daily coins; claim every day for a growing streak bonus | Everyone |
| `/deposit <amount>` | Put coins in the bank, safe from /rob | Everyone |
| `/dice <roll> <amount>` | Guess the dice roll: get it right and win 5x your bet | Everyone |
| `/highlow <bet>` | Guess if the next number is higher or lower: riskier guesses pay more | Everyone |
| `/leaderboard [scope]` | The richest users on this server, or across every server | Everyone |
| `/pay <member> <amount>` | Send coins from your wallet to another member | Everyone |
| `/rob <member>` | Try to steal from someone's wallet (banked coins are safe); fail and you pay a fine | Everyone |
| `/slots <bet>` | Spin the slot machine: three of a kind pays up to 250x | Everyone |
| `/weekly` | Claim a big coin reward once a week | Everyone |
| `/withdraw <amount>` | Take coins out of the bank into your wallet | Everyone |
| `/work` | Work a shift for some coins (once an hour) | Everyone |

</details>

<details>
<summary><b>Profile</b> (3)</summary>

| Command | What it does | Permission |
|---|---|---|
| `/bio <bio>` | Set the bio shown on your profile | Everyone |
| `/profile [member]` | View a profile card: coins, level, likes, birthday and bio | Everyone |
| `/rank [member]` | Show a rank card with your level and progress on this server | Everyone |

</details>

<details>
<summary><b>Engagement</b> (3)</summary>

| Command | What it does | Permission |
|---|---|---|
| `/birthday <set|remove|view>` | Set your birthday so servers can celebrate it | Everyone |
| `/giveaway <start|end|reroll|list>` | Run giveaways with an Enter button and random winners | Manage Server |
| `/poll <question> <options> [duration]` | Create a poll with buttons and live results | Everyone |

</details>

<details>
<summary><b>Roleplay</b> (30)</summary>

| Command | What it does | Permission |
|---|---|---|
| `/bite <member>` | Give someone a playful bite | Everyone |
| `/blush [member]` | Blush (at someone) | Everyone |
| `/cry [member]` | Cry (on someone's shoulder) | Everyone |
| `/cuddle <member>` | Cuddle up with someone | Everyone |
| `/dance [member]` | Dance (with someone) | Everyone |
| `/facepalm [member]` | Facepalm (at someone) | Everyone |
| `/feed <member>` | Feed someone something tasty | Everyone |
| `/handhold <member>` | Hold someone's hand | Everyone |
| `/handshake <member>` | Shake someone's hand | Everyone |
| `/happy [member]` | Be happy (with someone) | Everyone |
| `/highfive <member>` | Give someone a high five | Everyone |
| `/hug <member>` | Give someone a warm hug | Everyone |
| `/kiss <member>` | Give someone a kiss | Everyone |
| `/laugh [member]` | Laugh (at someone) | Everyone |
| `/nom <member>` | Nom on someone | Everyone |
| `/pat <member>` | Pat someone on the head | Everyone |
| `/peck <member>` | Give someone a little peck on the cheek | Everyone |
| `/poke <member>` | Poke someone to get their attention | Everyone |
| `/punch <member>` | Throw a (pretend) punch at someone | Everyone |
| `/shoot <member>` | Shoot someone (it's just a GIF) | Everyone |
| `/shrug [member]` | Shrug (at someone) | Everyone |
| `/slap <member>` | Slap someone | Everyone |
| `/sleep [member]` | Fall asleep (next to someone) | Everyone |
| `/smile [member]` | Smile (at someone) | Everyone |
| `/stare <member>` | Stare at someone | Everyone |
| `/think [member]` | Think really hard (about someone) | Everyone |
| `/tickle <member>` | Tickle someone | Everyone |
| `/wave <member>` | Wave at someone | Everyone |
| `/wink <member>` | Wink at someone | Everyone |
| `/yeet <member>` | Yeet someone into the sky | Everyone |

</details>

<details>
<summary><b>Utility</b> (4)</summary>

| Command | What it does | Permission |
|---|---|---|
| `/remind <me|list|cancel>` | Set reminders for later | Everyone |
| `/suggest <idea>` | Suggest an idea for the server; members vote on it | Everyone |
| `/suggestion <id> <status> [response]` | Approve, deny or mark a suggestion as implemented | Manage Server |
| `/ticket <open|close|panel|add>` | Private support tickets with the server staff | Everyone |

</details>

<details open>
<summary><b>Moderation</b> (17)</summary>

| Command | What it does | Permission |
|---|---|---|
| `/ban <user> [reason] [delete_days]` | Ban a user from the server, even if they've already left | Ban Members |
| `/deafen <user> [reason]` | Server-deafen and mute a member who is in a voice channel | Deafen Members |
| `/embed <title> <content> [color]` | Post a nicely formatted embed, great for announcements and rules | Manage Messages |
| `/kick <user> [reason]` | Remove a member from the server (they can rejoin with an invite) | Kick Members |
| `/lock [channel] [reason]` | Stop everyone from sending messages in a channel | Manage Channels |
| `/modlogs <user>` | Show the last 10 warns, kicks, bans and deafens for a user | Moderate Members |
| `/note <add|list|remove>` | Private moderator notes about a member | Moderate Members |
| `/purge <amount> [user]` | Bulk-delete up to 100 recent messages in this channel | Manage Messages |
| `/slowmode <delay>` | Make members wait between messages in this channel | Manage Channels |
| `/tempban <user> <duration> [reason]` | Ban someone for a set time; they're unbanned automatically | Ban Members |
| `/timeout <user> <duration> [reason]` | Stop a member from chatting, reacting and joining voice for a while | Moderate Members |
| `/unban <user_id> [reason]` | Lift a ban (use the user's ID) | Ban Members |
| `/undeafen <user> [reason]` | Undo /deafen: let a member hear and speak in voice again | Deafen Members |
| `/unlock [channel]` | Let everyone send messages in a locked channel again | Manage Channels |
| `/untimeout <user> [reason]` | End a member's timeout early | Moderate Members |
| `/warn <user> [reason]` | Give a member a formal warning; they get a DM and it's saved to their record | Moderate Members |
| `/warns <user>` | List every warning a user has received on this server | Moderate Members |

</details>

<details>
<summary><b>Configuration</b> (3)</summary>

| Command | What it does | Permission |
|---|---|---|
| `/command <command>` | Turn a command on or off for this server | Manage Server |
| `/prefix <prefix>` | Change the prefix for text commands on this server | Manage Server |
| `/settings <view|toggle|channel>` | View or change this server's bot settings | Manage Server |

</details>

## Dashboard

Anyone with **Manage Server** (or the owner) can manage a server at `/dashboard` after logging in with Discord. Access is checked against the bot's live view of the server, so permission changes apply immediately.

| Section | Page | What you can do |
|---|---|---|
| Server | **Overview** | Members, command usage (14 days), member growth (30 days), top commands, mod actions, which features are on |
| | **General** | Prefix; where commands work (everywhere, only in chosen channels, or everywhere except chosen channels) |
| | **Audit log** | Who changed which setting, and when |
| Commands | **Commands** | Turn commands or whole categories on and off; ⚙ per command: allowed roles, channels, cooldown |
| | **Custom commands** | Create, edit, disable and delete custom commands; embed or plain text; usage counts |
| Moderation | **Auto-mod** | Blocked words, invites, links and allowed domains, mass mentions, spam, punishment, exemptions |
| | **Mod log & punishments** | Mod-log channel, warning punishments, ban appeal DM, full action history |
| | **Event logs** | Channels for message, member, role and voice logs |
| | **Command log** | Every command run, filterable |
| Engagement | **Leveling** | Pace, cooldown, ignored channels, level-up messages, **role rewards** |
| | **Leaderboard** | Members ranked by level |
| | **Welcome & roles** | Welcome (with an optional card) and goodbye messages, auto-roles |
| | **Role panels** | Build button panels for self-assigned roles; edits update the posted message |
| | **Starboard** | Channel, emoji, reactions needed |
| | **Giveaways** | Start giveaways; end or reroll them |
| | **Birthdays** | Announcement channel and message |
| | **Music** | Live player (seek, pause, skip, loop, shuffle, volume, autoplay, reorder or remove queue songs) and settings: DJ roles, volumes, queue limits, auto-leave, 24/7, search source |
| | **Economy** | Currency name and emoji |
| Utility | **Tickets** | Staff roles, category, transcripts, welcome message; recent tickets |
| | **Suggestions** | Channel; approve, deny or mark implemented |
| | **Announcements** | Schedule messages once or on repeat |
| | **Embed builder** | Compose a message or embed with a live preview and send it |

Message fields show a live preview and accept these placeholders:

| Placeholder | Becomes |
|---|---|
| `{user}` | Username |
| `{user.name}` | Display name |
| `{user.mention}` | @mention |
| `{user.id}` | User ID |
| `{server}` | Server name |
| `{memberCount}` | Member count |
| `{channel}` | #channel mention |
| `{level}` | New level (level-up message) |
| `{args}` | Text after the command (custom commands) |

Custom commands and automatic messages can never ping `@everyone`, `@here` or roles. Only announcements and the embed builder can, on purpose.

**Public pages:** `/` (home), `/commands` (searchable command list) and `/stats` (live bot stats, shards, usage).

### Admin panel (bot owners)

Bot owners get an **Admin panel** link in the account menu (`/admin`). Owners are the Discord application's owner, or every member of its team, plus any IDs in `OWNER_IDS`. Owners can also open any server's dashboard.

| Tab | What you can do |
|---|---|
| **Overview** | Servers, users, uptime, ping, memory, commands per hour, shard health, top commands, system info |
| **Servers** | Every server the bot is in: search, sort by size, join date or name; open its dashboard, leave it, or blacklist it |
| **Users** | Look up anyone by ID: profile, wallet, bank and bio (editable), birthday, mutual servers; blacklist them |
| **Blacklist** | Blacklisted users (ignored everywhere) and servers (left immediately, and again if re-invited) |
| **Bot settings** | The bot's status (online/idle/dnd, activity and text with live `{servers}` / `{users}`), and commands turned off in every server (owners can still use them) |

## Project layout

```
ecosystem.config.cjs              PM2 config for both apps
packages/
  client/                         The bot + HTTP API
    index.ts                      Entry point: intents, prefix, API/OAuth setup
    commands/<category>/          One file per command (category = folder name)
    listeners/                    Discord events: leveling, auto-mod, logs, welcome, starboard, custom commands, error replies
    interaction-handlers/         Buttons that must keep working after restarts (role panels, giveaways, polls, tickets, music)
    preconditions/                Checks before every command (blacklist, disabled, channels, per-command rules, cooldowns)
    routes/                       API for the dashboard; the file path is the URL
    lib/
      settings.ts                 Per-server settings: one schema → types, defaults and validation
      scheduler.ts                Persistent scheduled tasks (temp bans, reminders, giveaways, announcements, birthdays)
      database/                   Drizzle schema (source of truth), queries and caches
      api/                        Route helpers: auth/permission checks, validation, stats
      structures/                 Base classes: VortexCommand (slash + prefix), RoleplayCommand, embed
      music/                      NodeLink connection, playback actions, checks (DJ, voice), now-playing card
      automod.ts, modlog.ts, engagement.ts, utility.ts, economy.ts, games.ts, images.ts, owner.ts, calc.ts, http.ts
    drizzle/                      Generated SQL migrations (applied automatically on start)
    scripts/                      migrate.ts, check-pieces.ts
  frontend/                       The website and dashboard
    server/api/[...path].ts       Proxies /api/* to the bot
    app/pages/                    Home, commands, stats, login, dashboard/[guild]/* sections
    app/components/               UI building blocks (ui/*) and charts (charts/*)
    app/composables/              API access, auth, per-server state, settings sections, drafts, toasts
```

### Scripts

In `packages/client`:

| Script | What it does |
|---|---|
| `bun run dev` | Run the bot, restarting on changes |
| `bun start` | Run the bot |
| `bun run check` | Load every command, listener, button handler and route **without logging in** and report problems (name clashes, invalid slash definitions) |
| `bun run typecheck` | TypeScript check |
| `bun run db:generate` | Create a migration after editing `lib/database/schema.ts` |
| `bun run db:migrate` | Apply migrations now (the bot also does this on start) |
| `bun run db:studio` | Browse the database in your browser |

In `packages/frontend`: `bun run dev`, `bun run build`, `bun start` (serves the build), `bun run typecheck`.

## Development guide

### Adding a command

Create `packages/client/commands/<category>/<name>.ts`. The folder name becomes the category in `/help` and on the website.

```ts
import { Command } from "@sapphire/framework";
import { SlashCommandBuilder } from "discord.js";
import { VortexCommand } from "../../lib/structures/command";

// /hello [user]: says hello.
export class HelloCommand extends VortexCommand {
    public override applicationCommandData = new SlashCommandBuilder()
        .setName("hello")
        .setDescription("Say hello to someone")
        .addUserOption((o) => o.setName("user").setDescription("Who to greet"));

    public override async chatInputRun(ctx: Command.ChatInputCommandInteraction) {
        const user = ctx.options.getUser("user") ?? ctx.user;
        return ctx.reply(`Hello, ${user}!`);
    }
}
```

That's all. It works as `/hello` and `->hello @someone`, shows up in `/help`, the website and the dashboard, and can be disabled or restricted per server.

- **Permissions:** pass `requiredUserPermissions: ["BanMembers"]` (and/or `requiredClientPermissions`) in the constructor options, like [ban.ts](packages/client/commands/moderation/ban.ts). Add `runIn: ["GUILD_ANY"]` for server-only commands.
- **Subcommands** (`.addSubcommand(...)`) work for prefix usage too: `->note add @user text`.
- **Slow work:** call `await ctx.deferReply()` first, then `ctx.editReply(...)`.
- **Buttons on your reply:** use `replyAndFetch(ctx, ...)` to get the message and attach a collector ([blackjack.ts](packages/client/commands/economy/blackjack.ts)). For buttons that must survive restarts, add an interaction handler instead ([interaction-handlers/](packages/client/interaction-handlers/)).
- **Outside APIs:** use `getJson()` from [lib/http.ts](packages/client/lib/http.ts) (timeout, cache, friendly errors).
- **Something later:** `schedule({ type, runAt, payload })` from [lib/scheduler.ts](packages/client/lib/scheduler.ts), plus `registerTask(type, handler)`.
- **Check it:** run `bun run check`.

### Adding a dashboard setting

1. Add one line to `SCHEMA` in [lib/settings.ts](packages/client/lib/settings.ts), e.g. `myFeature: { enabled: f.bool(false), channelId: f.id() }`. That gives you the type, the default and validation. No database migration is needed: settings are stored as JSON, and missing fields use the default.
2. Read it in the bot with `(await DBManager.getGuildConfig(guildId)).settings.myFeature` (cached; saving clears the cache).
3. Mirror the type in [app/types/dashboard.ts](packages/frontend/app/types/dashboard.ts) and add a page in `app/pages/dashboard/[guild]/`. `useSettingsSection("myFeature")` + `<UiSaveBar>` handle drafts, unsaved changes and saving. [starboard.vue](packages/frontend/app/pages/dashboard/[guild]/starboard.vue) is a 30-line example. Then add it to the sidebar in `pages/dashboard/[guild].vue`.

### Adding an API route

Routes use file-based paths under `packages/client/routes/`: `guilds/[guild]/thing.get.ts` serves `GET /guilds/:guild/thing`. Extend `ApiRoute` (not `Route`), and call `requireGuildManager(req, res)` for anything server-specific (`requireOwner` for owner-only). See [leaderboard.get.ts](packages/client/routes/guilds/[guild]/leaderboard.get.ts).

### Changing the database

Edit [lib/database/schema.ts](packages/client/lib/database/schema.ts), run `bun run db:generate`, and commit the new file in `drizzle/`. It's applied automatically the next time the bot starts.

## Troubleshooting

| Problem | Fix |
|---|---|
| `password authentication failed` | Put the user and password in the URL as `postgres://user:pass@host/db`, not as `?user=&password=` query parameters. URL-encode special characters in the password. |
| Bot exits with `Used disallowed intents` | `DISCORD_MEMBERS_INTENT=true` is set but **Server Members Intent** isn't enabled in the Developer Portal. |
| Slash commands don't show up | Global commands can take a few minutes after the first start. Also check the bot was invited with the `applications.commands` scope. |
| Prefix commands or auto-mod do nothing | Enable **Message Content Intent** in the Developer Portal. Check the server's prefix with `/help`. |
| Dashboard login: "Login isn't set up" | Set `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` and restart the bot. |
| Discord says `Invalid OAuth2 redirect_uri` | The redirect must be exactly `FRONTEND_URL` + `/oauth/callback`, **and** `DISCORD_CLIENT_ID` must be the same application as the bot. |
| Logged in but logged out again right away in production | Serve the dashboard over HTTPS (the cookie is `Secure` in production). |
| Website: "Couldn't reach the bot" | The bot isn't running, or `NUXT_API_URL` / `API_PORT` don't match. |
| Welcome messages, auto-roles or the growth chart do nothing | See [step 5](#5-optional-server-members-features). For roles, the bot's role must be above the roles it gives. |
| A role panel button says it can't give a role | Move the bot's role above that role in Server Settings → Roles. |
| A lookup command says the service didn't respond | The free public API is down or rate-limiting; try again later. |
| Music: "isn't set up" | Set `NODELINK_HOST` (and the password) in `.env` and restart the bot. |
| Music: "the music server is offline" | NodeLink isn't running or isn't reachable at `NODELINK_HOST:NODELINK_PORT`, or the password is wrong. Check the bot's log for "Music node" lines. |
| Music joins but stays silent | Make sure the bot can **Connect** and **Speak** in that voice channel, and that NodeLink can reach YouTube and other sources from its machine. |
| Spotify / Deezer links don't play | Add those services' credentials in NodeLink's `config.ts`. |
| A command is missing from `/help` or the website | Run `bun run check`: it shows files that failed to load or names that clash. |
