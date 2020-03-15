'use strict';
const ytdl = require('ytdl-core');
const fs = require('fs');
const request = require('request');
const { PATH, makeEmbed } = require('./util');
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
 */
const enqueue = (channel, media, name, message) => {
  playingQueue.push({
    channel: channel,
    media: media,
    name: name,
    message: message,
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
 */
const joinAndPlay = (vc, media, name, message, connection) => {
  if (!message.deleted)
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
          };
          playSong({ connection, song, message });
        })
        .catch((err) => {
          const nextSong = dequeue();
          message.channel.send('Could not join channel.');
          playNext(nextSong);
          console.log(err);
        });
    }
  } else {
    enqueue(vc, media, name, message);
    message.channel.send(
      makeEmbed(`Added ${name} to the queue!`, message.author)
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
  // On connecting to a voice channel, play the youtube stream
  const dispatch = connection.playArbitraryInput(song.media, { volume: 0.1 });
  // Delete the command message
  message.channel.send(
    makeEmbed(
      `Playing: ${song.name}\nTo: ${song.channel.name}`,
      message.author)
  );
  dispatch.on('end', (reason) => {
    const nextSong = dequeue();
    if (nextSong && nextSong.channel.name === currentChannel.name) {
      // If the next song is on the same channel
      playNext(nextSong, connection);
    } else {
      playNext(nextSong);
      // Leave the voice channel after finishing the stream
      song.channel.leave();
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
      joinAndPlay(
        song.channel,
        song.media,
        song.name,
        song.message,
        connection,
      );
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
const skip = (number, message) => {
  let cutSongName;
  if (!number) {
    if (currentSong) {
      cutSongName = currentSong;
      currentChannel.leave();
      // Skip the currently playing song
      currentSong = undefined;
      currentChannel = undefined;
      const nextSong = dequeue();
      setTimeout(() => {
        if (nextSong) {
          joinAndPlay(
            nextSong.channel,
            nextSong.media,
            nextSong.name,
            nextSong.message
          );
        }
      }, nextSongDelay);
    } else {
      message.channel.send('Nothing to skip!');
    }
  } else {
    // Skip the song at number in the queue
    if (number < playingQueue.length) {
      cutSongName = playingQueue[number].name;
      playingQueue.splice(number, 1);
    } else {
      message.channel.send(USAGESKIP);
    }
  }
  if (cutSongName) {
    message.channel.send(
      makeEmbed(`Skipped: ${cutSongName}`, message.author)
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
  let response = '\`\`\`\n';
  if (currentSong && currentChannel) {
    response += `Currently playing ${currentSong} to ${currentChannel.name}.\n`;
  }
  for (let i = 0; i < playingQueue.length; i++) {
    let song = playingQueue[i];
    response += `${i}. ${song.name} to ${song.channel.name}\n`;
  }
  response += '\`\`\`';
  message.channel.send(response);
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
 * @param {Object} Object.bot - The Discord Client object that represents
 * the bot
 */
const play = ({channel, media, message, bot}) => {
  if (!channel) {
    message.channel.send(USAGEPLAY);
    return;
  }
  const channelList = bot.channels.array();
  let vc;
  for (let i = 0; i < channelList.length; i++) {
    // Check if the channel is what we are searching for.
    // If the channel is a ., then join the vc with any users in it
    if (channelList[i].type === 'voice'
        && ((channel === channelList[i].name) ||
        (channel === '.' && channelList[i].members.array().length > 0))) {
      vc = channelList[i];
    }
  }
  // Check if the voice channel exists
  if (!vc) {
    message.channel.send('Could not find voice channel.');
    return;
  }

  if (!media) {
    // For attachments
    const attach = message.attachments.array();
    if (attach.length === 0) {
      message.channel.send(USAGEPLAY);
      return;
    }
    joinAndPlay(vc, request(attach[0].url), attach[0].filename, message);
  } else if (media.includes('www.youtube.com') || media.includes('youtu.be')) {
    // For youtube video streaming
    // Check if the url is valid
    if (!ytdl.validateURL(media)) {
      message.channel.send('Could not find youtube video.');
      return;
    }
    const ytStream = ytdl(media, { filter: 'audioonly' });
    ytdl.getBasicInfo(media, (err, info) => {
      if (err)
        console.log(err);
      joinAndPlay(vc, ytStream, info.title, message);
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
        if (musicFiles[i].substr(0, musicFiles[i].lastIndexOf('.')) === media) {
          fileToPlay = musicFiles[i];
          break;
        }
      }
    }
    if (!fileToPlay) {
      message.channel.send('Could not find file.');
      return;
    }
    const filePath = `${PATH}/${fileToPlay}`;
    joinAndPlay(
      vc,
      fs.createReadStream(filePath),
      fileToPlay.substr(0, fileToPlay.lastIndexOf('.')),
      message
    );
  }
};

const onText = (message, bot) => {
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];
  if (botCommand === '!play' || botCommand === '!pl') {
    let media;
    let channel;
    if (cmd.length === 2) {
      channel = cmd[1];
    } else {
      media = cmd[1];
      channel = cmd[2];
    }
    play({channel, media, message, bot});
  } else if (botCommand === '!queue' || botCommand === '!q') {
    queue(message);
  } else if (botCommand === '!skip' || botCommand === '!s') {
    const num = cmd[1];
    skip(num, message);
  }
};

module.exports = {
  skip,
  queue,
  play,
  onText,
};