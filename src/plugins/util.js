'use strict';
const request = require('request');
const fs = require('fs');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const validUrl = require('valid-url');

const appDir = path.dirname(require.main.filename);
const PATH = `${appDir}/../reactions`;
const EMOJI_PATH = `${appDir}/../emoji.json`;
const CRON_PATH = `${appDir}/../cron.json`;
const OUTPUT_PATH = `${appDir}/../output/`;
const DATA_PATH = `${appDir}/../data.json`;
const COLOR = 0x9400D3;
const MAX_YT_TIME = 150; // In seconds
// eslint-disable-next-line
const EMOJI_REGEX = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|[\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|[\ud83c[\ude32-\ude3a]|[\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/;
// How many words per message
const MESSAGE_MAX_WORD_LENGTH = 150;
const config = require('./../../config.json');


/**
 * Constructs an embeded message object
 *
 * @param {String} message - Message to put in the description box of the
 * embeded message
 * @param {Object} user - Discord User object. Will post avatar and
 * username along with message
 * @param {String} title - The title of the message
 * @return {Object} - Returns the constructed embeded message
 */
const makeEmbed = (message, user, title, footerText) => {
  return {
    embed: {
      thumbnail: {
        url: `${user.displayAvatarURL()}`,
      },
      color: COLOR,
      description: message,
      author: {
        name: title || user.username,
      },
      footer: {
        text: footerText,
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
const makeEmbedNoUser = (message, title, thumbnail) => {
  let embed = {
    color: COLOR,
    description: message,
    author: {
      name: title,
    },
  };
  if (thumbnail && validUrl.isUri(thumbnail)) {
    embed.thumbnail = {
      url: `${thumbnail}`,
    };
  }
  return {
    embed,
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
 * @param {Boolean} caseSensitive - If serach should be case sensitive
 * @return {Boolean} - If the file exists in that directory
 */
const hasFile = ({ path = PATH, fileName, caseSensitive = false }) => {
  const files = fs.readdirSync(path);
  // Check if the file already exists
  for (let i = 0; i < files.length; i++) {
    if (caseSensitive) {
      if (files[i].substr(0, files[i].lastIndexOf('.')) === fileName) {
        return true;
      }
    } else {
      if (files[i].substr(0, files[i].lastIndexOf('.')).toLowerCase() ===
          fileName.toLowerCase()) {
        return true;
      }
    }
  }
  return false;
};

/**
 * @obj: the json object to change
 * @access: string dot separates route to value
 * @value: new value
 */
function setValue(obj, access, value, append){
  if (typeof access === 'string'){
    access = access.split('.');
  }
  if (access.length > 1){
    const nextAccess = access.shift();
    if (!obj[nextAccess]) {
      obj[nextAccess] = {};
    }
    setValue(obj[nextAccess], access, value, append);
  } else {
    if (obj[access[0]]) {
      if (append) {
        obj[access[0]].push(value);
      } else {
        obj[access[0]] = [ value ];
      }
    } else {
      obj[access[0]] = [ value ];
    }
  }
}

/**
 * Adds a value to a json file.
 *
 * @param {String} path - The path to the file
 * @param {String} key - The key to add
 * @param {Object} value - The value to assign to the key in the file
 * @param {Boolean} append - Whether to append the value to an existing array
 * or overwrite the value
 * @param {Function} cb - The callback function
 */
const addJson = ({ path, key, value, append = true, cb = () => {} }) => {
  // First check if the file exists
  fs.exists(path, (exists) => {
    if (exists) {
      // Read the file and parse the data
      fs.readFile(path, (err, data) => {
        if (err) console.log('Could not read file: ', err);
        else {
          let file = JSON.parse(data);
          setValue(file, key, value, append);
          fs.writeFileSync(path, JSON.stringify(file));
          return cb();
        }
      });
    } else {
      // If the file doesn't exists, make it
      let newFile = {};
      setValue(newFile, key, value);
      fs.writeFileSync(path, JSON.stringify(newFile));
      return cb();
    }
  });
};

const getJson = ({ path, key = '', cb = () => {} }) => {
  // First check if the file exists
  fs.exists(path, (exists) => {
    if (exists) {
      // Read the file and parse the data
      fs.readFile(path, (err, data) => {
        if (err) console.log('Could not read file: ', err);
        else {
          let value = JSON.parse(data);
          if (key.length === 0) {
            return cb(value);
          }
          let keys = key.split('.');
          const len = keys.length;
          for (let i = 0; typeof value === 'object' && i < len; ++i) {
            value = value[keys[i]];
          }
          return cb(value);
        }
      });
    } else {
      // If the file doesn't exists, don't return anything
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
const removeJson = ({ path, key, value, cb = () => {} }) => {
  // First check if the file exists
  fs.exists(path, (exists) => {
    if (exists) {
      // Read the file and parse the data
      fs.readFile(path, (err, data) => {
        if (err) console.log('Could not read file: ', err);
        else {
          const originalFile = JSON.parse(data);
          let file = originalFile;
          if (key.length === 0) {
            return cb(value);
          }
          let keys = key.split('.');
          const len = keys.length;
          for (let i = 0; typeof file === 'object' && i < len - 1; ++i) {
            file = file[keys[i]];
          }
          if (!value) {
            // If no value specified, delete the json
            delete file[keys[len - 1]];
          } else {
            // Otherwise, remove the element from the array
            if (file && Array.isArray(file[keys[len - 1]])) {
              file[keys[len - 1]] = file[keys[len - 1]].filter(storedValue =>
                storedValue !== value
              );
            }
          }
          fs.writeFileSync(path, JSON.stringify(originalFile));
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
 * Adds a json object to a file.
 *
 * @param {String} path - The path to the file
 * @param {String} text - The text to add
 */
const addText = ({ path, text }) => {
  // First check if the file exists
  fs.exists(path, (exists) => {
    if (exists) {
      // Read the file and parse the data
      fs.readFile(path, (err, data) => {
        if (err) console.log('Could not read file: ', err);
        else {
          fs.writeFileSync(path, text);
          return;
        }
      });
    } else {
      // If the file doesn't exists, make it
      fs.writeFileSync(path, text);
      return;
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
const sendTextBlock = ({text, message, page = 1}) => {
  page -= 1;
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
    if (isNaN(page) || page > totalPages || page < 0) {
      message.channel.send('Could not find page!');
      return;
    }
    // Response text
    const messageText = '```\n'
    + textSplit.slice(firstIndex, lastIndex).join(' ')
    + `${(parseInt(page, 10) === totalPages) ? '' : '...'}`
    + `\nPage: ${page + 1} of ${totalPages + 1}`
    + '\n```';
    message.channel.send(messageText);
  } else {
    // If there are no pages
    message.channel.send('```\n' + text + '\n```');
    return;
  }
};

let exportDictionary = {};

/**
 * Downloads all messages from the channel
 *
 * @param {Channel} channel - the channel to download
 */
const exportMessages = (channel) => {
  exportDictionary[channel.name] = '';

  if (channel.type === 'text') {
    console.log('Export started.');
    channel.messages.fetch({ limit: 100 })
      .then(messages => {
        messages.each((message) => {
          if (message.cleanContent.length > 0) {
            exportDictionary[channel.name] += (message.cleanContent + '\n');
          }
        });
        if (messages.size >= 100) {
          exportRecursive(messages.last(), channel);
        } else {
          addText({
            path: OUTPUT_PATH + channel.name + '.txt',
            text: exportDictionary[channel.name],
          });
          console.log('Export finished.');
        }
      }).catch(console.error);
  }
};

const exportRecursive = (message, channel) => {
  channel.messages.fetch({ limit: 100, before: message.id })
    .then(messages => {
      messages.each((message) => {
        if (message.cleanContent.length > 0) {
          exportDictionary[channel.name] += (message.cleanContent + '\n');
        }
      });
      if (messages.size >= 100) {
        exportRecursive(messages.last(), channel);
      } else {
        addText({
          path: OUTPUT_PATH + channel.name + '.txt',
          text: exportDictionary[channel.name],
        });
        console.log('Export finished.');
      }
    }).catch(console.error);
};

const exportAllMessages = (guild) => {
  guild.channels.cache.each((channel) => { exportMessages(channel); });
};

/**
 * Downloads all messages from the channel
 *
 * @param {Channel} channel - the channel to download
 */
const exportFormattedMessages = (channel) => {
  exportDictionary[channel.name] = '';

  if (channel.type === 'text') {
    console.log('Export started.');
    channel.messages.fetch({ limit: 100 })
      .then(messages => {
        messages.each((message) => {
          if (message.cleanContent.length > 0) {
            exportDictionary[channel.name] += (message.author.username +
              '|' + message.cleanContent + '\n');
          }
        });
        if (messages.size >= 100) {
          exportFormattedRecursive(messages.last(), channel);
        } else {
          addText({
            path: OUTPUT_PATH + channel.name + 'GPT2.txt',
            text: exportDictionary[channel.name],
          });
          console.log('Export finished.');
        }
      }).catch(console.error);
  }
};

const exportFormattedRecursive = (message, channel) => {
  channel.messages.fetch({ limit: 100, before: message.id })
    .then(messages => {
      messages.each((message) => {
        if (message.cleanContent.length > 0) {
          exportDictionary[channel.name] += (message.author.username +
            '|' + message.cleanContent + '\n');
        }
      });
      if (messages.size >= 100) {
        exportFormattedRecursive(messages.last(), channel);
      } else {
        addText({
          path: OUTPUT_PATH + channel.name + 'GPT2.txt',
          text: exportDictionary[channel.name],
        });
        console.log('Export finished.');
      }
    }).catch(console.error);
};

const exportAllFormattedMessages = (guild) => {
  guild.channels.cache.each((channel) => { exportFormattedMessages(channel); });
};

/**
 * Formats the string by replacing escaped date sequences with the supplied date
 * i.e string = "The date is %Y %M %D right now" would return
 * "The date is 2019 11 26 right now" if the supplied date were
 * 2019 November 26th
 * @param {String} string - The string to format
 * @param {Date} date - The date to format the string with
 * @returns {String} - The final formmated string replacing the escaped dates
 */
const formatEscapedDates = (string, date) => {
  return string
    .replace(/%Y/g, date.getFullYear())
    .replace(/%M/g, `0${date.getMonth() + 1}`.slice(-2))
    .replace(/%D/g, `0${date.getDate()}`.slice(-2))
    .replace(/%H/g, date.getHours())
    .replace(/%M/g, date.getMinutes())
    .replace(/%S/g, date.getSeconds());
};

/**
 * Splits the string by spaces into an array, however it keeps words wrapped in
 * quotation marks together.
 * i.e 'get "something" from "any site"' =>
 * ["get", "something", "from", "any site"]
 */
const splitArgsWithQuotes = (string) => {
  const tokens = [].concat.apply([], string.split('"').map(function(v, i){
    return i % 2 ? '"' + v + '"' : v.split(' ');
  })).filter(Boolean);
  return tokens;
};

/**
 * Parses the discord id from a string
 * I.E <@12517231> returns 12517231
 * @param string - The string to parse for the id
 * @returns - The discord id parsed from the string or undefined
 */
const getDiscordId = (string) => {
  if ((string.startsWith('<@') || string.startsWith('<#'))
  && string.endsWith('>')) {
    string = string.slice(2, -1);

    if (string.startsWith('!')) {
      string = string.slice(1);
    }

    return string;
  }
};

const formatDateString = (date) => {
  return date.toLocaleString(config.locale, { timeZone: config.timeZone });
};

const isDirectMessageEnabled = (message) => {
  if (message.channel.type === 'dm') {
    return config.dmWhiteList.includes(message.content.split(' ')[0]);
  }
  return true;
};

module.exports = {
  PATH,
  EMOJI_PATH,
  EMOJI_REGEX,
  CRON_PATH,
  OUTPUT_PATH,
  DATA_PATH,
  COLOR,
  MAX_YT_TIME,
  exportMessages,
  exportFormattedMessages,
  exportAllMessages,
  exportAllFormattedMessages,
  makeEmbed,
  makeEmbedNoUser,
  ytdownload,
  download,
  hasFile,
  addJson,
  getJson,
  removeJson,
  sendText,
  sendTextBlock,
  config,
  formatEscapedDates,
  splitArgsWithQuotes,
  getDiscordId,
  formatDateString,
  isDirectMessageEnabled,
};
