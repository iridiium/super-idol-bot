const { getLyrics, getSong } = require('genius-lyrics-api');
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

			message.channel.send({ embed: lyrics_embed(lyrics) });
		}
		else {
			message.channel.send(error_embed('The requested song wasn\'t found.'));
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
		if (!line.includes('Solo]')) {
			if (line.charAt(0) == '[') {
				lyrics.push([]);
			}

			lyrics[lyrics.length - 1].push(line);
		}
		else {
			lyrics.push([line, '-']);
		}
	});

	let verses = [];	// eslint-disable-line prefer-const

	lyrics.forEach(function(verse) {
		const body = verse.slice(1, lyrics.length - 1);

		verses.push({
			name: verse[0],
			value: body,
		});
	});

	const embed = {
		color: 0x748e54,
		title: 'Lyrics:',
		fields: verses,
		timestamp: new Date(),
		footer: {
			text: 'Made by mcmakkers#9633',
		},
	};

	return embed;
};