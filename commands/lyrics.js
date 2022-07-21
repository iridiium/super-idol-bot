const { getLyrics } = require('genius-lyrics-api');
const axios = require('axios');


const Discord = require('discord.js');
const dotenv = require('dotenv');

dotenv.config();

module.exports = {
	name: 'lyrics',
	async execute(message, args) {
		const search_term = args.join('%20');
		const api_link = 'https://api.genius.com/search?q=' + search_term;

		const res = await axios.get(api_link, {
			headers: {
				'Authorization': 'Bearer ' + process.env.LYRICS_TOKEN,
			},
		});

		const lyrics_url = res.data.response.hits[0].result.url;

		if (lyrics_url) {
			const lyrics = await getLyrics(lyrics_url);

			if (lyrics) {
				return message.channel.send({ embed: lyrics_embed(lyrics) });
			}
			else {
				return message.channel.send(error_embed('The requested song wasn\'t found.'));
			}
		}
		else {
			return message.channel.send(error_embed('The requested song wasn\'t found.'));
		}
	},
};

const error_embed = (error) => {
	const embed = new Discord.MessageEmbed()
		.setColor('#cc2936')
		.setTitle('An error has occured!')
		.setDescription(error)
		.setTimestamp()
		.setFooter('Made by mcmakkers#9633');

	return embed;
};


const lyrics_embed = (raw) => {

	const lines = raw.split(/\r?\n/).filter(element => element);

	let lyrics = [];	// eslint-disable-line prefer-const

	lines.forEach(function(line) {
		// If the verse is a solo...
		if (!line.includes('Solo]')) {

			// If this line is the beginning of a verse, characterised by a [
			if (line.charAt(0) == '[') {
				lyrics.push({ name: line, value: [] });
			}
			// Otherwise add the line into the lyrics of the last verse
			else {
				lyrics[lyrics.length - 1].value.push(line);
			}

		}
		// ...thre are no lyrics so we just put a -
		else {
			lyrics.push({ name: line, value: '-' });
		}
	});

	// 25 is the maximum number of fields an embed can have
	if (lyrics.length > 25) {
		return error_embed('Too many verses.');
	}

	const embed = {
		color: 0x748e54,
		title: 'Lyrics:',
		fields: lyrics,
		timestamp: new Date(),
		footer: {
			text: 'Made by mcmakkers#9633',
		},
	};

	return embed;
};