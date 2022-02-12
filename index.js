// Constants (Modules + secrets)
const fs = require('fs');

const {
	Client, Collection,
} = require('discord.js');

const { PREFIX, token } = require('./config.json');

const bot = new Client();
bot.commands = new Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	bot.commands.set(command.name, command);

	for (const alias of command.aliases) {
		bot.commands.set(alias, command);
	}
}

// Events

bot.on('ready', () => {
	console.log('Status: Online');

	bot.user.setActivity('music i think');
});

// - Commands

bot.on('message', async message => {
	if (!message.content.startsWith(PREFIX) || message.author.bot) return;

	const args = message.content.slice(PREFIX.length).trim().split(/ +/);
	const commandName = args.shift().toLowerCase();

	const command = bot.commands.get(commandName)
		|| bot.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

	if (!command) return;

	try {
		bot.commands.get(commandName).execute(message, args, commandName);
	}
	catch (error) {
		console.error(error);
		message.reply('There was an error trying to execute that command.');
	}
});

bot.login(token);