# TokenClaimer Discord Bot

Minimal Discord bot for Blacket daily claiming.

> This bot stores your Blacket credentials locally and uses them to run daily claims on your behalf. It sends you DMs when claiming starts and when it finishes.

## What this bot does

- Stores your Blacket username and password locally in `Data/creds.json`
- Stores claim schedule and state in `Data/claimer_state.json`
- Supports only 4 slash commands: `/login`, `/logout`, `/claimer`, `/claimsettings`
- Schedules daily claims at two EST times
- DMs the configured user when a claim starts and after it finishes with the result

## Setup for complete beginners

### Step 1: Install Node.js

1. Go to https://nodejs.org
2. Download the latest LTS version for Windows
3. Install it using the installer
4. Open PowerShell after installation

### Step 2: Open this project folder in PowerShell

1. Open File Explorer
2. Go to `C:\Users\phill\Downloads\TokenClaimer`
3. Right-click inside the folder and choose `Open in Terminal`

### Step 3: Install dependencies

Run this command in PowerShell:

```powershell
npm install
```

### Step 4: Create a `.env` file

In the project folder, create a file named `.env` and put exactly this inside:

```env
DISCORD_TOKEN=your-discord-bot-token
```

Replace `your-discord-bot-token` with the token you get from the Discord Developer Portal.

### Step 5: Create a Discord bot and get its token

1. Go to https://discord.com/developers/applications
2. Click `New Application`
3. Give it a name, then click `Create`
4. Go to `Bot` on the left
5. Click `Add Bot`
6. Copy the `Token`
7. Paste the token into `.env` as shown above

### Step 6: Invite the bot to your server

1. In the Developer Portal, go to `OAuth2` > `URL Generator`
2. Under `Scopes`, check `bot` and `applications.commands`
3. Under `Bot Permissions`, check `Send Messages` and `Read Messages/View Channels`
4. Copy the generated URL
5. Open it in your browser and invite the bot to your server

### Step 7: Start the bot

In PowerShell, run:

```powershell
npm start
```

If everything is working, you should see a message like `Logged in as ...`.

## How to use the bot

### `/login username password`

Use this command in Discord to save your Blacket credentials. Example:

```text
/login username myblacketname password mysecretpassword
```

The bot will verify the login and save your credentials locally.

### `/logout`

Removes your stored credentials.

### `/claimer`

Toggles daily claiming ON or OFF.

### `/claimsettings time1 time2`

View or set two daily claim times in EST.

Example to set times:

```text
/claimsettings time1 08:30 time2 20:00
```

Example to view current times:

```text
/claimsettings
```

## DM notifications

When the bot runs a claim, it will DM you:

- `Starting Blacket daily claim for HH:MM EST.`
- `Claim finished for HH:MM EST.` with the results and next scheduled time

If claiming is enabled and the bot is running, you will receive status updates in DMs automatically.

## Files and folders

This project uses:

- `scr/index.js` — main bot code
- `.env` — contains `DISCORD_TOKEN`
- `Data/creds.json` — stores your encrypted password and username
- `Data/claimer_state.json` — stores the claim schedule and enabled/disabled state

The bot will create `Data/` and the JSON files automatically if they do not exist.

## Very important

- Never commit `.env` to Git or upload it anywhere.
- Never commit `Data/creds.json` or `Data/claimer_state.json`.
- Do not share your Discord bot token.
- Do not share your Blacket password.

## Need help instead of setting it up yourself?

If you want support or prefer someone else to help you set it up, join this Discord:

https://discord.gg/qbmR58QUv3

This setup was made by franxe.
