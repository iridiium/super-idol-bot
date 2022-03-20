const ytdl = require('ytdl-core');
const yt_search = require('yt-search');

const Discord = require('discord.js');

const queue = new Map();

module.exports = {
	name: 'play',
	aliases: ['skip', 'stop', 'queue', 'die', 'leave'],
	async execute(message, args, cmd) {
		if (!message.guild) {
			return message.channel.send(error_embed(
				'You cannot use this command in direct messages!',
			));
		}

		const voice_channel = message.member.voice.channel;
		if (!voice_channel) {
			return message.channel.send(error_embed(
				'You need to be in a voice channel to execute this command!',
			));
		}

		const permissions = message.member.voice.channel.permissionsFor(message.client.user);
		if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
			return message.channel.send(error_embed(
				'You don\'t have the correct permissions!',
			));
		}

		const server_queue = queue.get(message.guild.id);

		if (cmd == 'play') {
			if (!args.length) {
				return message.channel.send(error_embed(
					'You need to send the second argument!',
				));
			}

			let song = {};

			if (ytdl.validateURL(args[0])) {
				const song_info = await ytdl.getInfo(args[0]);
				song = { title: song_info.videoDetails.title,
					url: song_info.videoDetails.video_url,
					duration: song_info.videoDetails.duration,
					author: song_info.videoDetails.author.name,
				};
			}
			else {
				const video_finder = async (query) => {
					const video_result = await yt_search(query);
					return (
						video_result.videos.length > 1
					) ? video_result.videos[0] : null;
				};

				const video = await video_finder(args.join(' '));
				if (video) {
					song = {
						title: video.title,
						url: video.url,
						duration: video.duration,
						author: video.author.name,
					};
				}
				else {
					return message.channel.send(error_embed(
						'There was an error finding the specified video.',
					));
				}
			}

			if (!server_queue) {
				const queue_constructor = {
					voice_channel: voice_channel,
					text_channel: message.channel,
					connection: null,
					songs: [],
				};

				queue.set(message.guild.id, queue_constructor);
				queue_constructor.songs.push(song);

				try {
					const connection = await voice_channel.join();
					console.log(connection);
					queue_constructor.connection = connection;
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
				server_queue.songs.push(song);
				return message.channel.send(success_embed(
					`"${song.title}" added to queue!`,
				));
			}
		}
		else if (cmd === 'skip') {
			skip_song(message, server_queue);
		}
		else if (cmd === 'stop' || cmd === 'die') {
			stop_song(message, server_queue);
		}
		else if (cmd === 'queue') {
			display_queue(message, server_queue);
		}
		else if (cmd === 'leave') {
			leave(message, server_queue);
		}
	},
};

// Helper function for the play command

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
	song_queue.text_channel.send(success_embed(
		`Now playing ${song.title} (${song.duration}) by ${song.author}`,
	));
};

// Other commands which require queue access

const skip_song = async (message, server_queue) => {
	console.log(server_queue);
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
		server_queue.songs.shift();
		video_player(message.guild, server_queue.songs[0]);

		const song_skipped = server_queue.songs[0];
		try {
			return message.channel.send(success_embed(
				'Now playing:' + song_skipped.title,
			));
		}
		catch (exc) {
			return message.channel.send(success_embed(
				'Stopping the song, ending the queue and leaving the voice channel.',
			));
		}
	}
	catch (exc) {
		console.log(exc);
		return message.channel.send(error_embed(
			'An error happened.',
		));
	}
};

const stop_song = (message, server_queue) => {
	if (!message.member.voice.channel) {
		return message.channel.send(error_embed(
			'You need to be in a channel to execute this command!',
		));
	}
	if (!server_queue) {
		return message.channel.send(error_embed(
			'There are no songs in the queue!',
		));
	}

	try {
		server_queue.connection.dispatcher.end();
	}
	catch (exc) {
		return message.channel.send(error_embed(
			'An error happened!',
		));
	}

	server_queue.songs = [];
	message.guild.me.voice.channel.leave();

	message.channel.send(success_embed(
		'Stopping the song, ending the queue and leaving the voice channel.',
	));
};

const display_queue = (message, server_queue) => {
	if (!server_queue) {
		return message.channel.send(error_embed(
			'There are no songs in the queue!',
		));
	}

	try {
		let index = 0;
		server_queue.songs.forEach(function(song) {
			index++;
			message.reply(`
Place in queue: ${index}
Song title: ${song.title}
URL: ${song.url}
Duration: ${song.duration}
Author: ${song.author}
			`);
		});
	}
	catch (err) {
		message.channel.send(error_embed(
			'There are no songs in the queue!',
		));
	}
};

const leave = (message, server_queue) => {
	if (!message.member.voice.channel) {
		return message.channel.send(error_embed(
			'You need to be in a channel to execute this command!',
		));
	}

	try {
		server_queue.connection.dispatcher.end();
	}
	catch (exc) {
		console.log(exc);
		return message.channel.send(error_embed(
			'There is no queue!',
		));
	}

	server_queue.songs = [];
	message.guild.me.voice.channel.leave();

	message.channel.send(success_embed(
		'Stopping the song, ending the queue and leaving the voice channel.',
	));
};


// Embed functions

const error_embed = (error) => {
	const embed = new Discord.MessageEmbed()
		.setColor('#b00323')
		.setTitle('An error has occured!')
		.setDescription(error)
		.setTimestamp()
		.setFooter('Made by mcmakkers#9633');

	return embed;
};

const success_embed = (success) => {
	const embed = new Discord.MessageEmbed()
		.setColor('#f1c232')
		.setTitle('Success!')
		.setDescription(success)
		.setTimestamp()
		.setFooter('Made by mcmakkers#9633');

	return embed;
};