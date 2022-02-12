const { MessageEmbed } = require('discord.js');

module.exports = {
	name: 'help',
	async execute(message) {
		const helpCommand = new MessageEmbed()
			.setColor('#0099ff')
			.setTitle('Some title')
			.setDescription('Some description here')
			.addFields(
				{ name: '//play', value: 'Takes URL or YouTube search query and plays music from it.' },
				{ name: '//skip', value: 'Skips the song that is playing.' },
				{ name: '//stop', value: 'Stops the song that is palying, empties the queue, and leaves the voice channel.' },
				{ name: '//queue', value: 'Displays all songs in the queue.' },
			)
			.setTimestamp()
			.setFooter({ text: 'Super Idol bot made by mcmakkers#9633' });

		message.channel.send({ embeds: [helpCommand] });
	},
};