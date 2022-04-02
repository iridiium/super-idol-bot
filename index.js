// Constants (Modules + secrets)
const fs = require('fs');

const Discord = require('discord.js');

const dotenv = require('dotenv');

dotenv.config();

const { PREFIX, activity } = require('./config.json');

const bot = new Discord.Client();
bot.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	bot.commands.set(command.name, command);

	if (command.aliases) {
		for (const alias of command.aliases) {
			bot.commands.set(alias, command);
		}
	}
}

// Events

bot.on('ready', () => {
	console.log('Status: Online');

	bot.user.setActivity(activity);
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

bot.login(process.env.DISCORD_TOKEN);