# Blacket Claimer Discord Bot

Secure multi-user Discord bot for Blacket daily claiming, built with Bun, TypeScript, NestJS, and Necord.

## What It Does

- Registers Discord slash commands through Necord.
- Stores one Blacket account per Discord user.
- Keeps claim settings and claim history isolated per user.
- Encrypts stored Blacket passwords with AES-256-GCM.
- Uses a credential key separate from the Discord bot token.
- Sends claim start, finish, and failure updates by DM.

No bot that stores reversible credentials can be “completely secure,” but this version avoids the old high-risk patterns: single-user global state, Discord-token-derived encryption, misleading password hashing, and committing runtime data by accident.

## Requirements

- Bun 1.1 or newer
- A Discord application bot token
- A base64-encoded 32-byte credential key
- SQLite through Prisma

Install Bun from https://bun.sh if it is not already installed.

## Setup

Install dependencies:

```bash
bun install
```

Create a credential key:

```bash
bun -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Create `.env` in the project root:

```env
DISCORD_TOKEN=your-discord-bot-token
BLACKET_CREDENTIAL_KEY=your-generated-base64-key
DATABASE_URL=file:./blacket.db
```

Create or update the SQLite database:

```bash
bun run db:push
```

Build the bot:

```bash
bun run build
```

Start the bot:

```bash
bun start
```

For development with watch mode:

```bash
bun run dev
```

## Discord Setup

1. Go to https://discord.com/developers/applications.
2. Create or select an application.
3. Open `Bot`, create the bot, and copy its token into `.env`.
4. Open `OAuth2` > `URL Generator`.
5. Select the `bot` and `applications.commands` scopes.
6. Add permissions for sending messages and viewing channels.
7. Invite the bot to your server with the generated URL.

## Commands

- `/login username password` verifies and stores your Blacket credentials.
- `/logout` removes your stored credentials and claim settings.
- `/claimer` toggles your own daily claiming on or off.
- `/claimsettings` shows your current claim times.
- `/claimsettings time1 time2` sets your two daily claim times in `HH:MM` EST format.

## Runtime Files

The bot writes private runtime state to a Prisma SQLite database at `prisma/blacket.db` by default. To store it somewhere else, change `DATABASE_URL`:

```env
DATABASE_URL=file:/absolute/path/to/private/blacket.db
```

Keep `.env` and the SQLite database private. Both are ignored by git.

## Project Scripts

```bash
bun install      # install dependencies
bun run db:push # create or update the SQLite database schema
bun run build   # compile TypeScript to dist/
bun start       # run dist/main.js
bun run dev     # run src/main.ts in watch mode
```

## Security Notes

- Never share `DISCORD_TOKEN`.
- Never share `BLACKET_CREDENTIAL_KEY`.
- Losing `BLACKET_CREDENTIAL_KEY` means stored passwords cannot be decrypted.
- Rotating `BLACKET_CREDENTIAL_KEY` requires users to run `/login` again.
- Host the bot only on a machine or account you trust.
