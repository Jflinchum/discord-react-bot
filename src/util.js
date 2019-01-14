'use strict';
const request = require('request');
const fs = require('fs');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const stringSimilarity = require('string-similarity');

const appDir = path.dirname(require.main.filename);
const settings = require(`${appDir}/../settings.json`);
const DISCORD_TOKEN = settings.DISCORD_TOKEN;
const WIT_AI_TOKEN = settings.WIT_AI_TOKEN;
const WAKE_WORDS = settings.WAKE_WORDS;
const PATH = `${appDir}/../reactions`;
const EMOJI_PATH = `${appDir}/../emoji.json`;
const SOUND_FX_PATH = `${appDir}/../botSounds`;
const CHANNEL_JOIN_FX = `${SOUND_FX_PATH}/channelJoin`;
const AFFIRMATION_FX = `${SOUND_FX_PATH}/affirm`;
const NEGATIVE_FX = `${SOUND_FX_PATH}/negative`;
const COLOR = 0x9400D3;
const MAX_YT_TIME = 150; // In seconds
// eslint-disable-next-line
const EMOJI_REGEX = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/;
// How many words per message
const MESSAGE_MAX_WORD_LENGTH = 150;


/**
 * Constructs an embeded message object
 *
 * @param {String} message - Message to put in the description box of the
 * embeded message
 * @param {Object} user - Discord User object. Will post avatar and
 * username along with message
 * @return {Object} - Returns the constructed embeded message
 */
const makeEmbed = (message, user) => {
  return {
    embed: {
      thumbnail: {
        url: `${user.avatarURL}`,
      },
      color: COLOR,
      description: message,
      author: {
        name: user.username,
      },
    },
  };
};

/**
 * Constructs an embeded message object
 *
 * @param {String} message - Message to put in the description box of the
 * embeded message
 * @param {String} title - Message to put in the title area of the
 * embeded message
 * @return {Object} - Returns the constructed embeded message
 */
const makeEmbedNoUser = (message, title) => {
  return {
    embed: {
      color: COLOR,
      description: message,
      author: {
        name: title,
      },
    },
  };
};

/**
 * Downloads a file given a url and saves it to the local storage space
 *
 * @param {String} url - URL of the file to download
 * @param {String} fileName - The name to save the file as
 * @param {String} extension - The extension to save the file as
 * (i.e txt, mp3, jpeg)
 * @param {Number|Optional} timeStart - The start time to go to for
 * music in seconds
 * @param {Number|Optional} timeStop - The stop time to trim to for
 * music in seconds
 * @param {Function} cb - Callback function is called with a string of
 * any errors.
 */
const download = ({url, fileName, extension, timeStart, timeStop, cb}) => {
  const fullPath = `${PATH}/${fileName}.${extension}`;
  // Check if the file exists
  if (hasFile({fileName})) {
    return cb('File name already exists');
  }
  request.head(url, (err, res, body) => {
    if (err) {
      return cb(err);
    }
    if (extension === 'mp3' || extension === 'wav') {
      const cmd = ffmpeg({source: url});
      if (timeStart) {
        cmd.seekInput(timeStart);
      }
      if (timeStop) {
        cmd.seekInput(timeStop - timeStart);
      }
      cmd.save(`${PATH}/${fileName}.${extension}`)
        .on('end', cb);
      return;
    } else {
      request(url).pipe(fs.createWriteStream(fullPath)).on('close', cb);
    }
  });
};

/**
 * Downloads the audio of a youtube video as an mp3 and saves it in the local
 * storage
 *
 * @param {String} url - URL of the audio to download
 * @param {String} fileName - The name to save the file as
 * @param {Number|Optional} timeStart - The start time to go to
 * in the video in seconds
 * @param {Number|Optional} duration - How long to download in seconds
 * @param {Function} cb - Callback function is called with a string of
 * any errors.
 */
const ytdownload = ({url, fileName, cb, timeStart, duration}) => {
  // Check if the file exists
  if (hasFile({fileName})) {
    return cb('File name already exists');
  }
  // Make sure the url is valid
  if (ytdl.validateURL(url)) {
    const stream = ytdl(url, {
      quality: 'highestaudio',
    });
    // Set the audioBitrate and store it in local storage
    const cmd = ffmpeg(stream)
      .audioBitrate(128);
    if (timeStart) {
      cmd.seekInput(timeStart || 0);
    }
    if (duration) {
      cmd.duration(duration);
    }

    cmd.save(`${PATH}/${fileName}.mp3`)
      .on('end', cb);
    return;
  } else {
    // If the url is not valid
    return cb('Could not validate url.');
  }
};
/**
 * Checks if the file exists in a directory (ignoring the file extension)
 *
 * @param {String} path - The path to check
 * @param {String} fileName - The file to search for
 * @return {Boolean} - If the file exists in that directory
 */
const hasFile = ({path = PATH, fileName}) => {
  const files = fs.readdirSync(path);
  // Check if the file already exists
  for (let i = 0; i < files.length; i++) {
    if (files[i].substr(0, files[i].lastIndexOf('.')) === fileName) {
      return true;
    }
  }
  return false;
};

/**
 * Adds a json object to a file.
 *
 * @param {String} path - The path to the file
 * @param {String} key - The key to add
 * @param {Object} value - The value to assign to the key in the file
 * @param {Function} cb - The callback function
 */
const addJson = ({ path, key, value, cb }) => {
  // First check if the file exists
  fs.exists(path, (exists) => {
    if (exists) {
      // Read the file and parse the data
      fs.readFile(path, (err, data) => {
        if (err) console.log(err);
        else {
          let file = JSON.parse(data);
          if (file[key]) {
            file[key].push(value);
          } else {
            file[key] = [ value ];
          }
          fs.writeFileSync(path, JSON.stringify(file));
          return cb();
        }
      });
    } else {
      // If the file doesn't exists, make it
      let newFile = {};
      newFile[key] = [ value ];
      fs.writeFileSync(path, JSON.stringify(newFile));
      return cb();
    }
  });
};

/**
 * Removes a json object from a file.
 *
 * @param {String} path - The path to the file
 * @param {String} key - The key to add
 * @param {Function} cb - The callback function
 */
const removeJson = ({ path, key, cb }) => {
  // First check if the file exists
  fs.exists(path, (exists) => {
    if (exists) {
      // Read the file and parse the data
      fs.readFile(path, (err, data) => {
        if (err) console.log(err);
        else {
          let file = JSON.parse(data);
          delete file[key];
          fs.writeFileSync(path, JSON.stringify(file));
          return cb();
        }
      });
    } else {
      // If the file doesn't exists, return callback
      return cb();
    }
  });
};

/**
 * Sends the text string to the message channel, paginating it based off
 * of MESSAGE_MAX_LENGTH.
 *
 * @param {String} text - The text to send to the channel
 * @param {Object} message - The Discord Message Object to respond to
 * @param {Integer} page - The page for the text
 */
const sendText = ({text, message, page = 0}) => {
  const textSplit = text.split(' ');
  if (textSplit && textSplit.length > MESSAGE_MAX_WORD_LENGTH) {
    const firstIndex = page * MESSAGE_MAX_WORD_LENGTH;
    let lastIndex = firstIndex + MESSAGE_MAX_WORD_LENGTH;
    const totalPages = Math.floor(textSplit.length / MESSAGE_MAX_WORD_LENGTH);
    // Sanity check page index
    if (firstIndex > textSplit.length) {
      message.channel.send('Could not find page!');
      return;
    }
    if (lastIndex > textSplit.length) {
      lastIndex = textSplit.length;
    }
    // Response text
    const messageText = textSplit.slice(firstIndex, lastIndex).join(' ')
    + `${(parseInt(page, 10) === totalPages) ? '' : '...'}`
    + `\nPage: ${page} of ${totalPages}`;
    message.channel.send(messageText);
  } else {
    // If there are no pages
    message.channel.send('```\n' + text + '\n```');
    return;
  }
};

/**
 * Sends the text string in a block comment (```text```) to the message channel,
 * paginating it based off of MESSAGE_MAX_LENGTH.
 *
 * @param {String} text - The text to send to the channel
 * @param {Object} message - The Discord Message Object to respond to
 * @param {Integer} page - The page for the text
 */
const sendTextBlock = ({text, message, page = 0}) => {
  const textSplit = text.split(' ');
  if (textSplit && textSplit.length > MESSAGE_MAX_WORD_LENGTH) {
    const firstIndex = page * MESSAGE_MAX_WORD_LENGTH;
    let lastIndex = firstIndex + MESSAGE_MAX_WORD_LENGTH;
    const totalPages = Math.floor(textSplit.length / MESSAGE_MAX_WORD_LENGTH);
    // Sanity check page index
    if (firstIndex > textSplit.length) {
      message.channel.send('Could not find page!');
      return;
    }
    if (lastIndex > textSplit.length) {
      lastIndex = textSplit.length;
    }
    // Response text
    const messageText = '```\n'
    + textSplit.slice(firstIndex, lastIndex).join(' ')
    + `${(parseInt(page, 10) === totalPages) ? '' : '...'}`
    + `\nPage: ${page} of ${totalPages}`
    + '\n```';
    message.channel.send(messageText);
  } else {
    // If there are no pages
    message.channel.send('```\n' + text + '\n```');
    return;
  }
};

/**
 * Searches through the voice channels and returns the proper
 * Discord VoiceChannel object. If channel is ".", it will search for the
 * first channel it finds with users.
 *
 * @param {String} channel - The channel to search for
 * @param {Object} bot - The Discord Client object that represents the bot
 * @param {Object} message - The Discord Message Object to respond to
 * @return {Object} - The Discord VoiceChannel Object
 */
const findVoiceChannel = ({ channel, bot, message }) => {
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
  return vc;
};

/**
 * Plays a random sound clip from the specified directory
 *
 * @param {Object} connection - The Discord VoiceConnection object to play the
 * clip to
 * @param {String} path - The path to find a random sound clip in
 * @returns {Object} - The Discord Dispatch object from playing the clip
 */
const playRandomFile = (connection, path, cb = () => {}) => {
  const soundClips = fs.readdirSync(path);
  if (soundClips.length === 0) {
    return null;
  }
  const clip = soundClips[Math.floor(Math.random() * soundClips.length)];
  const dispatch = connection.playFile(`${path}/${clip}`);
  /*
   * This is a workaround for a bug in which the stream starts to get delayed
   * after playing many files on the same connection.
   */
  dispatch.on('start', () => {
    connection.player.streamingData.pausedTime = 0;
  });
  return dispatch;
};

/**
 * Plays a random sound clip from the channel join fx directory
 *
 * @param {Object} connection - The Discord VoiceConnection object to play the
 * clip to
 * @returns {Object} - The Discord Dispatch object from playing the clip
 */
const playChannelJoin = (connection) => {
  return playRandomFile(connection, CHANNEL_JOIN_FX);
};

/**
 * Plays a random sound clip from the channel affirmation fx directory
 *
 * @param {Object} connection - The Discord VoiceConnection object to play the
 * clip to
 * @returns {Object} - The Discord Dispatch object from playing the clip
 */
const playAffirmation = (connection) => {
  return playRandomFile(connection, AFFIRMATION_FX);
};

/**
 * Plays a random sound clip from the channel negative fx directory
 *
 * @param {Object} connection - The Discord VoiceConnection object to play the
 * clip to
 * @returns {Object} - The Discord Dispatch object from playing the clip
 */
const playNegative = (connection) => {
  return playRandomFile(connection, NEGATIVE_FX);
};

const strCmp = (string1, string2) => {
  return stringSimilarity.compareTwoStrings(string1, string2);
};


module.exports = {
  DISCORD_TOKEN,
  WIT_AI_TOKEN,
  WAKE_WORDS,
  PATH,
  EMOJI_PATH,
  SOUND_FX_PATH,
  CHANNEL_JOIN_FX,
  AFFIRMATION_FX,
  NEGATIVE_FX,
  EMOJI_REGEX,
  COLOR,
  MAX_YT_TIME,
  makeEmbed,
  makeEmbedNoUser,
  ytdownload,
  download,
  hasFile,
  addJson,
  removeJson,
  sendText,
  sendTextBlock,
  findVoiceChannel,
  playChannelJoin,
  playAffirmation,
  playNegative,
  strCmp,
};
