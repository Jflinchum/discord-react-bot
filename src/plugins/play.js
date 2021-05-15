'use strict';
const ytdl = require('ytdl-core');
const fs = require('fs');
const https = require('https');
const {
  PATH,
  makeEmbed,
  setReplayButton,
  createReactionCallback,
  isDiscordCommand,
  getReplyFunction,
} = require('./util');
const USAGEPLAY = '`usage: [!play/!pl] [<name>] [<voiceChannel>/.]`';
const USAGESKIP = '`usage: [!skip/!s] [<index>]`';

const nextSongDelay = 500; // In milliseconds

let currentSong;
let currentChannel;
let playingQueue = [];

/**
 * Enqueues the song into the playing queue as a JSON
 *
 * @param {Object} channel - The Discord VoiceChannel object to play the media
 * @param {String} media - The url to the music to enqueue
 * @param {String} name - The title of the music to play
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 * @param {Object} author - The author that instantiated the command
 */
const enqueue = (channel, media, name, message, author) => {
  playingQueue.push({
    channel,
    media,
    name,
    message,
    author,
  });
};

/**
 * Dequeues the next song in the playing queue.
 *
 * @returns {Object} - The next song in the queue.
 */
const dequeue = () => {
  return playingQueue.shift();
};

/**
 * Joins the voice channel specified and streams the media into the channel.
 * Supports any arbitrary file (mp3, url, etc.)
 *
 * @param {Object} channel - The Discord VoiceChannel object to play the media
 * @param {String} media - The url to the music to enqueue
 * @param {String} name - The title of the music to play
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 * @param {Object|Optional} connection - A Discord Voice Connection Object
 * @param {Object} author - The author of the person trying to play the media
 */
const joinAndPlay = ({ vc, media, name, message, connection, author }) => {
  let replyFunction = getReplyFunction(message);
  if (!message.deleted && !isDiscordCommand(message) && !message.interaction)
    message.delete();
  if (!currentSong) {
    currentSong = name;
    currentChannel = vc;
    if (connection) {
      // If there is already a connection, play the song through it
      const song = {
        channel: vc,
        media,
        name,
        message,
        author,
      };
      playSong({ connection, song, message });
    } else {
      // If there isn't a connection, join the voice channel
      vc.join()
        .then((connection) => {
          const song = {
            channel: vc,
            media,
            name,
            message,
            author,
          };
          playSong({ connection, song, message });
        })
        .catch((err) => {
          const nextSong = dequeue();
          replyFunction('Could not join channel.');
          playNext(nextSong);
          console.log('Could not join channel: ', err);
        });
    }
  } else {
    enqueue(vc, media, name, message, author);
    replyFunction(
      makeEmbed({
        message: `Added ${name} to the queue!`,
        user: author,
        member: message.guild.members.cache.get(author.id).displayName,
        color: message.guild.members.cache.get(author.id).displayColor,
      })
    );
  }
};

/**
 * Plays the media through the connection and handles leaving the channel
 *
 * @param {Object} connection - The Discord Voice Connection object
 * to play the song through
 * @param {Object} song - The song object to play
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 */
const playSong = ({ connection, song, message }) => {
  let replyFunction = getReplyFunction(message);
  // On connecting to a voice channel, play the youtube stream
  const dispatch = connection.play(song.media, { volume: 0.3 });
  replyFunction(
    makeEmbed({
      message: `Playing: ${song.name}\nTo: ${song.channel.name}`,
      user: song.author,
      member: message.guild.members.cache.get(song.author.id).displayName,
      footerText: message.content || `/play ${song.name} ${song.channel.name}`,
      color: message.guild.members.cache.get(song.author.id).displayColor,
    })
  ).then((playMessage) => {
    if (!playMessage && isDiscordCommand(message)) {
      message.fetchReply().then((playMessage) => {
        setReplayButton(playMessage, (reaction) => {
          // Set the author to whoever just reacted with the emoji
          const newAuthor = reaction.users.cache.last();
          play({
            channel: message.options[1]?.value,
            media: message.options[0].value,
            message,
            author: newAuthor,
          });
        });
        createReactionCallback('🛑', playMessage, (reaction) => {
          // Set the author to whoever just reacted with the emoji
          const newAuthor = reaction.users.cache.last();
          skip({
            author: newAuthor,
            guild: message.guild,
            message,
          });
        });
      });
    } else {
      setReplayButton(playMessage, (reaction) => {
        let cmd;
        let media;
        let channel;
        if (message?.content) {
          cmd = message.content.split(' ');
          media;
          channel;
          if (cmd.length <= 2) {
            // For attachments
            const attach = message.attachments.array();
            if (attach.length > 0) {
              media = attach[0];
              channel = cmd[1];
            } else {
              media = cmd[1];
              cmd.splice(2, cmd.length).join(' ');
            }
          } else {
            media = cmd[1];
            channel = cmd.splice(2, cmd.length).join(' ');
          }
        } else {
          media = message.options[0].value;
          channel = message.options[1]?.value;
        }
        // Set the author to whoever just reacted with the emoji
        const newAuthor = reaction.users.cache.last();
        play({
          channel,
          media,
          message,
          author: newAuthor,
        });
      });
      createReactionCallback('🛑', playMessage, (reaction) => {
        // Set the author to whoever just reacted with the emoji
        const newAuthor = reaction.users.cache.last();
        skip({
          author: newAuthor,
          guild: message.guild,
          message,
        });
      });
    }
  });
  dispatch.on('finish', () => {
    const nextSong = dequeue();
    if (nextSong && currentChannel
    && nextSong.channel.id === currentChannel.id) {
      // If the next song is on the same channel
      playNext(nextSong, connection);
    } else {
      // Leave the voice channel after finishing the stream
      song.channel.leave();
      playNext(nextSong);
    }
  });
  dispatch.on('error', (err) => {
    console.log(`ERR: ${err}`);
  });
};

/**
 * Plays the next song in the queue after a delay
 *
 * @param {Object} song - The song object to play
 * @param {Object|Optional} connection - The Discord voice connection object
 */
const playNext = (song, connection) => {
  currentSong = undefined;
  currentChannel = undefined;
  setTimeout(() => {
    if (song) {
      joinAndPlay({
        vc: song.channel,
        media: song.media,
        name: song.name,
        message: song.message,
        connection,
        author: song.author,
      });
    }
  }, nextSongDelay);
};

/**
 * Skips the song in the queue. If no index is given, it will stop playing the
 * current song. Otherwise, it will skip the song at the index in the playing
 * queue.
 *
 * @param {Number} number - The index to skip. Can be undefined
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 */
const skip = ({ number, guild, author, message }) => {
  let replyFunction = getReplyFunction(message);
  let cutSongName;
  if (!number) {
    if (currentSong) {
      cutSongName = currentSong;
      let oldChannel = currentChannel;
      // Skip the currently playing song
      const nextSong = dequeue();
      if (!nextSong) {
        currentChannel = null;
        currentSong = null;
        oldChannel.leave();
      }
      if (nextSong && currentChannel
      && nextSong.channel.id === currentChannel.id) {
        // If the next song is on the same channel
        playNext(nextSong);
      } else {
        // Leave the voice channel after finishing the stream
        oldChannel.leave();
        playNext(nextSong);
      }
    } else {
      if (currentChannel) {
        currentChannel.leave();
      } else {
        // Check if the bot is in any channels in the guild and leave it
        if (message.channel.guild.me.voice.channel) {
          message.channel.guild.me.voice.channel.leave();
        } else {
          replyFunction('Nothing to skip!');
        }
      }
      return;
    }
  } else {
    // Skip the song at number in the queue
    if (number < playingQueue.length) {
      cutSongName = playingQueue[number].name;
      playingQueue.splice(number, 1);
    } else {
      replyFunction(USAGESKIP);
    }
  }
  if (cutSongName) {
    replyFunction(
      makeEmbed({
        message: `Skipped: ${cutSongName}`,
        user: author,
        member: guild.members.cache.get(author.id).displayName,
        color: guild.members.cache.get(author.id).displayColor,
      })
    );
  }
};

/**
 * Prints out the current playing queue to the message's channel
 *
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 */
const queue = (message) => {
  let replyFunction = getReplyFunction(message);
  let response = '```\n';
  if (currentSong && currentChannel) {
    response += `Currently playing ${currentSong} to ${currentChannel.name}.\n`;
  }
  for (let i = 0; i < playingQueue.length; i++) {
    let song = playingQueue[i];
    response += `${i}. ${song.name} to ${song.channel.name}\n`;
  }
  response += '```';
  replyFunction(response);
};

/**
 * Parses the media into an attachment url, youtube url, or generic url and
 * plays it into the specified channel
 *
 * @param {Object} Object.channel - The Discord VoiceChannel object to play
 * the media
 * @param {String} Object.media - The url to the music to enqueue
 * @param {Object} Object.message - The Discord Message Object that initiated
 * the command
 * @param {Object} Object.author - The author of the person trying to play the
 * media
 */
const play = ({ channel, media, message, author }) => {
  let replyFunction = getReplyFunction(message);
  const channelList = message.guild.channels.cache.array();
  let vc;
  for (let i = 0; i < channelList.length; i++) {
    // Check if the channel is what we are searching for.
    // If the channel is a . or if no channel is provided, then join the vc with any users in it
    if (channelList[i].type === 'voice'
        && ((channel && channel.toLowerCase() === channelList[i].name.toLowerCase()) ||
        ((channel === '.' || !channel) && channelList[i].members.array().length > 0))) {
      vc = channelList[i];
    }
  }
  // Check if the voice channel exists
  if (!vc) {
    replyFunction('Could not find voice channel.');
    return;
  }

  if (media && media.url || media.filename) {
    https.get(media.url, (response) => {
      joinAndPlay({
        vc,
        media: response,
        name: media.name,
        message,
        author,
      });
    });
  } else if (media.includes('www.youtube.com') || media.includes('youtu.be')) {
    // For youtube video streaming
    // Check if the url is valid
    if (!ytdl.validateURL(media)) {
      replyFunction('Could not find youtube video.');
      return;
    }
    ytdl.getBasicInfo(media).then((info) => {
      let options = {
        quality: 'highestaudio',
      };
      if (info.videoDetails.isLive) {
        options.isHLS = true;
      }
      const ytStream = ytdl(media, options);
      joinAndPlay({
        vc,
        media: ytStream,
        name: info.videoDetails.title,
        message,
        author,
      });
    }).catch((err) => {
      console.log('Could not get youtube info: ', err);
      replyFunction('Error getting youtube video.');
      return;
    });
  } else {
    // For playing local files
    const files = fs.readdirSync(PATH);
    const musicFiles = files.filter(file => {
      const exten = file.substr((file.lastIndexOf('.') + 1));
      return exten === 'mp3' || exten === 'wav';
    });
    let fileToPlay;
    if (media === '*') {
      const randomFileIndex = Math.floor(
        Math.random() * Math.floor(musicFiles.length)
      );
      fileToPlay = musicFiles[randomFileIndex];
    } else {
      // Find the file associated with the name
      for (let i = 0; i < musicFiles.length; i++) {
        if (
          musicFiles[i].substr(0, musicFiles[i].lastIndexOf('.')).toLowerCase()
            === media.toLowerCase()) {
          fileToPlay = musicFiles[i];
          break;
        }
      }
    }
    if (!fileToPlay) {
      replyFunction(`Could not find ${media}.`);
      return;
    }
    const filePath = `${PATH}/${fileToPlay}`;
    joinAndPlay({
      vc,
      media: fs.createReadStream(filePath),
      name: fileToPlay.substr(0, fileToPlay.lastIndexOf('.')),
      message,
      author,
    });
  }
};

const handleDiscordMessage = (message) => {
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];
  if (botCommand === '!play' || botCommand === '!pl') {
    let media;
    let channel;
    if (cmd.length <= 2) {
      // For attachments
      const attach = message.attachments.array();
      if (attach.length > 0) {
        media = attach[0];
        channel = cmd[1];
      } else {
        media = cmd[1];
        cmd.splice(2, cmd.length).join(' ');
      }
    } else {
      media = cmd[1];
      channel = cmd.splice(2, cmd.length).join(' ');
    }
    if (!media) {
      message.channel.send(USAGEPLAY);
      return;
    }
    play({ channel, media, message, author: message.author });
  } else if (botCommand === '!queue' || botCommand === '!q') {
    queue(message);
  } else if (botCommand === '!skip' || botCommand === '!s') {
    const number = cmd[1];
    skip({
      number,
      guild: message.guild,
      message,
      author: message.author,
    });
  }
};

const handleDiscordCommand = (interaction) => {
  if (interaction.commandName === 'play') {
    const media = interaction.options[0]?.value;
    const channel = interaction.options[1]?.value;
    play({ channel, media, author: interaction.user, message: interaction });
  } else if (interaction.commandName === 'queue') {
    queue(interaction);
  } else if (interaction.commandName === 'skip') {
    const index = interaction.options[0]?.value;
    skip({
      number: index,
      guild: interaction.guild,
      message: interaction,
      author: interaction.user,
    });
  }
};

const onText = (discordTrigger) => {
  if (isDiscordCommand(discordTrigger)) {
    handleDiscordCommand(discordTrigger);
  } else {
    handleDiscordMessage(discordTrigger);
  }
};

const commandData = [
  {
    name: 'play',
    description: 'Plays a sound clip or youtube video to a voice channel!',
    options: [
      {
        name: 'sound_clip',
        type: 'STRING',
        description: 'The sound clip name or youtube link you want to play. Accepts wildcards.',
        required: true,
      },
      {
        name: 'channel_name',
        type: 'STRING',
        description: 'The channel you want to play the sound clip to. Defaults to the first channel with users.',
        required: false,
      }
    ],
  },
  {
    name: 'skip',
    description: 'Skips sound clips playing or in the queue.',
    options: [
      {
        name: 'index',
        type: 'INTEGER',
        description: 'The index of the song in queue that you want to skip.',
        required: false,
      },
    ],
  },
  {
    name: 'queue',
    description: 'Shows the current playing queue of sound clips.',
  }
];

module.exports = {
  skip,
  queue,
  play,
  onText,
  commandData,
};
