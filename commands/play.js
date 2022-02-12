const ytdl = require('ytdl-core');
const yt_search = require('yt-search');

const queue = new Map();

module.exports = {
	name: 'play',
	aliases: ['skip', 'stop', 'queue'],
	async execute(message, args, cmd) {
		const voice_channel = message.member.voice.channel;
		if (!voice_channel) {
			return message.reply(
				'You need to be in a voice channel to execute this command!',
			);
		}

		const permissions = message.member.voice.channel.permissionsFor(message.client.user);
		if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
			return message.reply('You don\'t have the correct permissions!');
		}

		const server_queue = queue.get(message.guild.id);

		if (cmd == 'play') {
			if (!args.length) return message.reply('You need to send the second argument!');
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
					message.reply('Error finding video, ');
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
					queue_constructor.connection = connection;
					video_player(message.guild, queue_constructor.songs[0], queue, message);
				}
				catch (err) {
					queue.delete(message.guild.id);
					message.reply('There was an error connecting!');
					throw err;
				}
			}
			else {
				server_queue.songs.push(song);
				return message.channel.send(`${song.title} added to queue!`);
			}
		}
		else if (cmd === 'skip') {
			skip_song(message, server_queue);
		}
		else if (cmd === 'stop') {
			stop_song(message, server_queue);
		}
		else if (cmd === 'queue') {
			display_queue(message, server_queue);
		}
	},
};

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
	song_queue.text_channel.send(
		`Now playing ${song.title} (${song.duration}) by ${song.author}`,
	);
};

const skip_song = (message, server_queue) => {
	if (!message.member.voice.channel) {
		return message.reply('You need to be in a channel to execute this command!');
	}
	if (!server_queue) {
		return message.reply('There are no songs in the queue!');
	}
	server_queue.connection.dispatcher.end();
};

const stop_song = (message, server_queue) => {
	if (!message.member.voice.channel) {
		return message.channel.send('You need to be in a channel to execute this command!');
	}
	if (!server_queue) {
		return message.reply('There are no songs in the queue!');
	}

	message.reply('Stopping all songs, leaving the channel!');
	server_queue.connection.dispatcher.end();
	server_queue.songs = [];
	message.guild.me.voice.channel.leave();
};

const display_queue = (message, server_queue) => {
	if (!server_queue) {
		return message.reply('There are no songs in the queue!');
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
		message.reply('There are no songs coming up!');
	}
};