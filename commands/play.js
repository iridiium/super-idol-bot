// Importing modules
const ytdl = require('ytdl-core');
const yt_search = require('yt-search');

const Discord = require('discord.js');

const queue = new Map();

// Module body
module.exports = {
	name: 'play',

	// All of the different commands that have code in this file
	aliases: ['skip', 'stop', 'queue', 'die', 'leave', 'join', 'remove'],

	async execute(message, args, cmd) {
		// If the message is not being sent in a server i.e. direct messaged:
		if (!message.guild) {
			return message.channel.send(error_embed(
				'You cannot use this command in direct messages!',
			));
		}

		// Gets the voice channel that the bot is in
		const voice_channel = message.member.voice.channel;

		// If the bot is not connected to a voice channel:
		if (!voice_channel) {
			return message.channel.send(error_embed(
				'You need to be in a voice channel to execute this command!',
			));
		}

		// Gets permissions of the bot
		const permissions = message.member.voice.channel.permissionsFor(message.client.user);
		// If the bot cannot connect to a voice channel nor speak in a voice channel:
		if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
			return message.channel.send(error_embed(
				'You don\'t have the correct permissions!',
			));
		}

		// From the map queue, gets the list of songs from the key of the id of the guild
		const server_queue = queue.get(message.guild.id);

		// conditional statement for each command
		if (cmd == 'play') {
			// If there was no song link/search term:
			if (!args.length) {
				return message.channel.send(error_embed(
					'You need to send the second argument!',
				));
			}

			// Defines new dictionary song that will store all the information for the
			let song = {};

			// If the link, which is the first element of args, is an URL:
			if (ytdl.validateURL(args[0])) {
				// song_info stores the information that ytdl has gotten from YouTube
				const song_info = await ytdl.getInfo(args[0]);

				song = { title: song_info.videoDetails.title,
					url: song_info.videoDetails.video_url,
					duration: song_info.videoDetails.duration,
					author: song_info.videoDetails.author.name,
				};
			}
			else {
				// If the first argument was not a link:
				const video_finder = async (query) => {
					const video_result = await yt_search(query);

					// If the length of the list of the videos fetched is more than 1
					// (successful query), return the first result of the videos, otherwise return null
					return (
						video_result.videos.length > 1
					) ? video_result.videos[0] : null;
				};

				// video is the result from running video_finder
				// so either null or the first YouTube video
				const video = await video_finder(args.join(' '));

				// If the query was successful i.e. null was not reutrned from video_finder:
				if (video) {
					song = {
						title: video.title,
						url: video.url,
						duration: video.duration,
						author: video.author.name,
						thumbnail: video.thumbnail,
					};
				}
				else {
					return message.channel.send(error_embed(
						'There was an error finding the specified video.',
					));
				}
			}

			// If there is no server_queue, or an empty server_queue:
			if (!server_queue || server_queue.songs.length == 0) {
				// The sample queue strcuture
				// (voice channel of bot, text channel for bot to reply to, whether bot is connected, song list)
				const queue_constructor = {
					voice_channel: voice_channel,
					text_channel: message.channel,
					connection: null,
					songs: [],
				};

				// Add a new entry to the map queue with the server ID and queue constructor
				queue.set(message.guild.id, queue_constructor);
				// Add the queried song to the songs value in the queue constructor
				queue_constructor.songs.push(song);

				// Try to
				try {
					// Join a voice channel
					const connection = await voice_channel.join();
					// Get the connection info
					queue_constructor.connection = connection;
					// Plays a song in a server
					video_player(message.guild, queue_constructor.songs[0]);
				}
				catch (err) {
					queue.delete(message.guild.id);
					return message.channel.send(error_embed(
						'There was an error connecting!',
					));
				}
			}
			else {
				// If the queue isn't empty, add this song to the server queue to be played next.
				server_queue.songs.push(song);
				return message.channel.send(success_embed(
					`"${song.title}" added to queue!`, 'Song added to queue!',
				));
			}
		}
		else if (cmd === 'skip') {
			skip_song(message, server_queue);
		}
		else if (cmd === 'stop' || cmd === 'die' || cmd === 'leave') {
			stop_song(message, server_queue);
		}
		else if (cmd === 'queue') {
			display_queue(message, server_queue);
		}
		else if (cmd === 'join') {
			join(message, server_queue);
		}
		else if (cmd === 'remove') {
			remove(message, server_queue, args);
		}
	},
};

// Helper functions

const video_player = async (guild, song) => {
	const song_queue = queue.get(guild.id);

	if (!song) {
		song_queue.voice_channel.leave();
		queue.delete(guild.id);
		return;
	}

	const stream = ytdl(song.url, { filter: 'audioonly' });
	song_queue.connection.play(stream, { seek: 0, volume: 0.5 }).on('finish', () => {
		song_queue.songs.shift();
		video_player(guild, song_queue.songs[0]);
	});

	song_queue.text_channel.send(song_play_embed(song));
};

// Other commands which require queue access

const skip_song = async (message, server_queue) => {

	if (!message.member.voice.channel) {
		return message.channel.send(error_embed(
			'You need to be in a voice channel to execute this command!',
		));
	}
	if (!server_queue) {
		return message.channel.send(error_embed(
			'There are no songs in the queue!',
		));
	}
	try {
		const voice_channel = message.member.voice.channel;
		await voice_channel.join();

		server_queue.songs.shift();
		video_player(message.guild, server_queue.songs[0]);

		const song_skipped = server_queue.songs[0];
		try {
			return message.channel.send(success_embed(
				'Now playing: ' + song_skipped.title, 'Song skipped!',
			));
		}
		catch (exc) {
			return message.channel.send(success_embed(
				'Stopping the song, ending the queue and leaving the voice channel.', 'Songs stopped!',
			));
		}
	}
	catch (exc) {
		console.log(exc);
		return message.channel.send(error_embed(
			'An error happened!',
		));
	}
};

const stop_song = (message, server_queue) => {
	if (!message.member.voice.channel) {
		return message.channel.send(error_embed(
			'You need to be in a channel to execute this command!',
		));
	}

	try {
		server_queue.connection.dispatcher.end();
		queue.get(message.guild.id).songs = [];
	}
	catch (exc) {
		console.log(exc);
	}

	try {
		message.guild.me.voice.channel.leave();
	}
	catch (exc) {
		console.log(exc);
		return message.channel.send(error_embed(
			'The bot is not in a channel!',
		));
	}

	message.channel.send(success_embed(
		'Stopping the song and leaving the voice channel.', 'Songs stopped!',
	));
};

const display_queue = (message, server_queue) => {
	if (!server_queue) {
		return message.channel.send(error_embed(
			'There are no songs in the queue!',
		));
	}

	try {
		const queue_embed_value = queue_embed(server_queue.songs);
		if (queue_embed_value.fields.length > 0) {
			message.channel.send({ embed: queue_embed_value });
		}
		else {
			throw 'All songs have already been removed from the queue.';
		}
	}
	catch (err) {
		message.channel.send(error_embed(
			'There are no songs in the queue!',
		));
	}
};

const join = async (message) => {
	const voice_channel = message.member.voice.channel;
	await voice_channel.join();

	message.channel.send(success_embed(
		'Voice channel joined!', 'Joined!',
	));
};

const remove = (message, server_queue, args) => {
	try {
		const song_index = parseInt(args[0]) - 1;
		const song = server_queue.songs[song_index].title;

		delete server_queue.songs[song_index];

		message.channel.send(remove_embed(
			song,
		));
	}
	catch (exc) {
		message.channel.send(error_embed(
			'Invalid song index!',
		));
	}
};


// Embed functions

const queue_embed = (arr) => {
	const songs = [];
	let index = 0;

	arr.forEach(function(song) {
		index++;

		if (index < 11) {
			songs.push(
				{
					name: index,
					value: `${song.title} by ${song.author} (${song.duration}); ${song.url}`,
				},
			);
		}
	});

	const embed = {
		color: 0x748e54,
		title: 'Queue:',
		fields: songs,
		timestamp: new Date(),
		footer: {
			text: 'Made by mcmakkers#9633',
		},
	};

	return embed;
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

const success_embed = (success, title) => {
	const embed = new Discord.MessageEmbed()
		.setColor('#748e54')
		.setTitle(title)
		.setDescription(success)
		.setTimestamp()
		.setFooter('Made by mcmakkers#9633');

	return embed;
};

const remove_embed = (song_name) => {
	const embed = new Discord.MessageEmbed()
		.setColor('#748e54')
		.setTitle('Songs removed!')
		.setDescription(song_name + ' has been removed from the queue.')
		.setTimestamp()
		.setFooter('Made by mcmakkers#9633');

	return embed;
};

const song_play_embed = (song_info) => {
	const embed = new Discord.MessageEmbed()
		.setColor('#748e54')
		.setTitle('Playing song!')
		.addFields(
			{ name: 'Song name:', value: song_info.title },
			{ name: 'Song link:', value: song_info.url },
			{ name: 'Song duration:', value: song_info.duration, inline: true },
			{ name: 'YouTube channel:', value: song_info.author, inline: true },
		)
		.setImage(song_info.thumbnail)
		.setTimestamp()
		.setFooter('Made by mcmakkers#9633');

	return embed;
};