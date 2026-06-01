# TokenClaimer Discord Bot

Minimal Discord bot for Blacket daily claiming.

## Setup

1. Clone or copy this project.
2. Run `npm install` in the project root.
3. Create a Discord bot application and get its token.
4. Create a `.env` file in the project root with:

```env
DISCORD_TOKEN=your-discord-bot-token
```

5. Invite the bot to your server with the required slash command permissions.
6. Start the bot with:

```bash
npm start
```

## Data Storage

This bot stores local state in `Data/`:

- `Data/creds.json`
- `Data/claimer_state.json`

The bot will create these files automatically if they are missing.

## Bot Commands

Use these slash commands only:

- `/login username password` — store Blacket credentials for this user
- `/logout` — remove stored credentials
- `/claimer` — toggle daily claiming on or off
- `/claimsettings time1 time2` — view or set two daily claim times in EST

## Important

- Never commit `.env` or any files in `Data/` to version control.
- Do not share your Discord bot token or Blacket password publicly.

## Help

If you are unsure how to set up the bot, follow these steps:

1. Install Node.js and `npm`.
2. Run `npm install` in this directory.
3. Create the `.env` file and add your `DISCORD_TOKEN`.
4. Start the bot with `npm start`.
5. Use the slash commands in Discord to configure login and claim settings.

If you want support without doing the setup yourself, join the community here:

https://discord.gg/qbmR58QUv3

This bot setup was made by franxe.
