    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');
    const fetch = require('node-fetch');
    const dotenv = require('dotenv');
    const { Client, GatewayIntentBits, SlashCommandBuilder, Events } = require('discord.js');

    dotenv.config();
    const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
    if (!DISCORD_TOKEN) {
    console.error('Missing DISCORD_TOKEN in .env');
    process.exit(1);
    }

    const DATA_DIR = path.join(__dirname, 'Data');
    if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const CREDS_FILE = path.join(DATA_DIR, 'creds.json');
    const STATE_FILE = path.join(DATA_DIR, 'claimer_state.json');

    const defaultState = {
    claimEnabled: false,
    times: ['12:00', '18:00'],
    lastClaimed: {}
    };

    const commands = [
    new SlashCommandBuilder()
        .setName('login')
        .setDescription('Store Blacket credentials for daily claiming')
        .addStringOption((option) =>
        option.setName('username').setDescription('Blacket username').setRequired(true)
        )
        .addStringOption((option) =>
        option.setName('password').setDescription('Blacket password').setRequired(true)
        ),
    new SlashCommandBuilder().setName('logout').setDescription('Remove stored Blacket credentials'),
    new SlashCommandBuilder().setName('claimer').setDescription('Toggle daily claiming on or off'),
    new SlashCommandBuilder()
        .setName('claimsettings')
        .setDescription('View or set two daily claim times in EST')
        .addStringOption((option) =>
        option.setName('time1').setDescription('First claim time in HH:MM format').setRequired(false)
        )
        .addStringOption((option) =>
        option.setName('time2').setDescription('Second claim time in HH:MM format').setRequired(false)
        )
    ].map((command) => command.toJSON());

    const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages], partials: ['CHANNEL'] });

    let creds = loadJson(CREDS_FILE, {});
    let state = loadJson(STATE_FILE, defaultState);

    function loadJson(filePath, defaultValue) {
    try {
        if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
        return defaultValue;
        }
        const content = fs.readFileSync(filePath, 'utf8');
        return content.trim() ? JSON.parse(content) : defaultValue;
    } catch (error) {
        console.error(`Error loading ${filePath}:`, error);
        return defaultValue;
    }
    }

    function saveJson(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error saving ${filePath}:`, error);
    }
    }

    function hashPassword(password) {
    return crypto.createHash('sha256').update(password, 'utf8').digest('hex');
    }

    function getEncryptionKey() {
    return crypto.createHash('sha256').update(DISCORD_TOKEN, 'utf8').digest();
    }

    function encryptText(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return {
        iv: iv.toString('hex'),
        data: encrypted.toString('hex')
    };
    }

    function decryptText(encrypted) {
    if (!encrypted || !encrypted.iv || !encrypted.data) {
        return null;
    }
    const iv = Buffer.from(encrypted.iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);
    return Buffer.concat([decipher.update(Buffer.from(encrypted.data, 'hex')), decipher.final()]).toString('utf8');
    }

    function getEstDate(reference = new Date()) {
    const utc = reference.getTime() + reference.getTimezoneOffset() * 60000;
    return new Date(utc - 5 * 60 * 60000);
    }

    function formatTime(date) {
    const hours = pad(date.getUTCHours());
    const minutes = pad(date.getUTCMinutes());
    return `${hours}:${minutes}`;
    }

    function pad(value) {
    return String(value).padStart(2, '0');
    }

    function getDateKey(date) {
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    return `${year}-${month}-${day}`;
    }

    function getNextClaimTime() {
    const est = getEstDate();
    const nowMinutes = est.getUTCHours() * 60 + est.getUTCMinutes();
    const ordered = [...state.times].sort();
    for (const time of ordered) {
        const [hours, minutes] = time.split(':').map(Number);
        const scheduledMinutes = hours * 60 + minutes;
        if (scheduledMinutes > nowMinutes) {
        return `${time} EST today`;
        }
    }
    return `${ordered[0]} EST tomorrow`;
    }

    function validateTimeFormat(time) {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
    }

    async function registerCommands() {
    try {
        await client.application.commands.set(commands);
        console.log('Slash commands registered.');
    } catch (error) {
        console.error('Failed to register commands:', error);
    }
    }

    async function loginUser(username, password) {
    const response = await fetch('https://blacket.org/worker/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Login failed: ${response.status} ${text}`);
    }

    const cookies = response.headers.raw()['set-cookie'] || [];
    return cookies.map((value) => value.split(';')[0]).join('; ');
    }

    async function claimAll(cookie) {
    const endpoints = [
        'https://blacket.org/worker/user/daily',
        'https://blacket.org/worker2/user/daily',
        'https://blacket.org/worker/daily',
        'https://blacket.org/worker2/daily'
    ];

    const results = [];

    for (const url of endpoints) {
        try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            ...(cookie ? { Cookie: cookie } : {})
            }
        });
        const body = await response.text();
        results.push({ url, status: response.status, body: body.slice(0, 300) });
        } catch (error) {
        results.push({ url, status: 'error', body: error.message });
        }
    }

    return results;
    }

    async function sendDm(userId, message) {
    try {
        const user = await client.users.fetch(userId);
        await user.send(message);
    } catch (error) {
        console.error(`Unable to DM user ${userId}:`, error);
    }
    }

    async function runClaim(time) {
    if (!creds.username || !creds.encryptedPassword || !creds.userId) {
        console.log('No credentials stored for scheduled claim.');
        return;
    }

    const password = decryptText(creds.encryptedPassword);
    if (!password) {
        console.log('Unable to decrypt stored password for scheduled claim.');
        return;
    }

    await sendDm(creds.userId, `Starting Blacket daily claim for ${time} EST.`);

    let cookie = null;
    try {
        cookie = await loginUser(creds.username, password);
    } catch (error) {
        await sendDm(creds.userId, `Blacket login failed before claim: ${error.message}`);
        return;
    }

    const results = await claimAll(cookie);
    const resultText = results
        .map((item) => `• ${item.url} -> ${item.status}
    ${item.body}`)
        .join('\n\n');

    const nextTime = getNextClaimTime();
    await sendDm(
        creds.userId,
        `Claim finished for ${time} EST.

    Results:
    ${resultText}

    Next scheduled claim: ${nextTime}`
    );

    const est = getEstDate();
    state.lastClaimed = state.lastClaimed || {};
    state.lastClaimed[time] = getDateKey(est);
    saveJson(STATE_FILE, state);
    }

    async function checkSchedule() {
    if (!state.claimEnabled) {
        return;
    }

    const est = getEstDate();
    const currentTime = formatTime(est);
    const todayKey = getDateKey(est);

    for (const time of state.times) {
        if (currentTime !== time) {
        continue;
        }
        state.lastClaimed = state.lastClaimed || {};
        if (state.lastClaimed[time] === todayKey) {
        continue;
        }
        await runClaim(time);
    }
    }

    client.once(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user.tag}`);
    await registerCommands();
    setInterval(checkSchedule, 30 * 1000);
    await checkSchedule();
    });

    client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.commandName;

    try {
        if (command === 'login') {
        const username = interaction.options.getString('username');
        const password = interaction.options.getString('password');
        const hashed = hashPassword(password);
        const encryptedPassword = encryptText(password);

        await loginUser(username, password);

        creds = {
            username,
            passwordHash: hashed,
            encryptedPassword,
            userId: interaction.user.id
        };
        saveJson(CREDS_FILE, creds);

        await interaction.reply({ content: 'Credentials stored securely. Daily claiming will use these credentials.', ephemeral: true });
        return;
        }

        if (command === 'logout') {
        creds = {};
        saveJson(CREDS_FILE, creds);
        await interaction.reply({ content: 'Stored credentials have been removed.', ephemeral: true });
        return;
        }

        if (command === 'claimer') {
        state.claimEnabled = !state.claimEnabled;
        saveJson(STATE_FILE, state);

        const nextTime = getNextClaimTime();
        const message = state.claimEnabled
            ? `Daily claiming enabled. Next scheduled claim: ${nextTime}`
            : 'Daily claiming disabled.';

        if (state.claimEnabled && creds.userId) {
            await sendDm(creds.userId, message);
        }

        await interaction.reply({ content: message, ephemeral: true });
        return;
        }

        if (command === 'claimsettings') {
        const time1 = interaction.options.getString('time1');
        const time2 = interaction.options.getString('time2');

        if (!time1 && !time2) {
            const nextTime = getNextClaimTime();
            await interaction.reply({
            content: `Current claim times: ${state.times.join(', ')} EST\nNext scheduled claim: ${nextTime}`,
            ephemeral: true
            });
            return;
        }

        if (!time1 || !time2) {
            await interaction.reply({ content: 'Please provide both time1 and time2 in HH:MM format.', ephemeral: true });
            return;
        }

        if (!validateTimeFormat(time1) || !validateTimeFormat(time2)) {
            await interaction.reply({ content: 'Times must be in HH:MM 24-hour format, for example 08:30 or 21:15.', ephemeral: true });
            return;
        }

        state.times = [time1, time2];
        saveJson(STATE_FILE, state);

        const nextTime = getNextClaimTime();
        await interaction.reply({ content: `Claim times updated to ${time1} and ${time2} EST. Next scheduled claim: ${nextTime}`, ephemeral: true });
        return;
        }
    } catch (error) {
        console.error('Command error:', error);
        await interaction.reply({ content: `An error occurred: ${error.message}`, ephemeral: true });
    }
    });

    client.login(DISCORD_TOKEN);
