const Discord = require('discord.js');

module.exports = {
	name: 'help',
	async execute(message, args, cmd) {
		const embed = new Discord.MessageEmbed()
			.setColor('#fa9705')
			.setTitle('Help')
			.setDescription('The help command for this bot.')
			.addFields(
				{ name: '//play', value: 'Takes URL or YouTube search query and plays music from it.' },
				{ name: '//skip', value: 'Skips the song that is playing.' },
				{ name: '//stop / //die / //leave', value: 'Stops the song that is playing, empties the queue, and leaves the voice channel.' },
				{ name: '//queue', value: 'Displays the first 10 songs in the queue.' },
				{ name: '//join', value: 'Makes the bot join the voice channel you are in.' },
			)
			.setTimestamp()
			.setFooter('Made by mcmakkers#9633');

		message.channel.send(embed);
	},
};