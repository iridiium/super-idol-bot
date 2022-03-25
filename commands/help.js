module.exports = {
	name: 'help',
	async execute(message, args, cmd, Discord) {
		const embed = new Discord.MessageEmbed()
			.setColor('#fa9705')
			.setTitle('Help')
			.setDescription('The help command for this bot.')
			.addFields(
				{ name: '//play', value: 'Takes URL or YouTube search query and plays music from it.' },
				{ name: '//skip', value: 'Skips the song that is playing.' },
				{ name: '//stop / //die', value: 'Stops the song that is playing, empties the queue, and leaves the voice channel.' },
				{ name: '//queue', value: 'Displays all songs in the queue.' },
			)
			.setTimestamp()
			.setFooter('Made by mcmakkers#9633');

		message.channel.send(embed);
	},
};