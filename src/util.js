'use strict';
const request = require('request');
const fs = require('fs');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

const appDir = path.dirname(require.main.filename);
const PATH = `${appDir}/../reactions`;
const EMOJI_PATH = `${appDir}/../emoji.json`;
const COLOR = 0x9400D3;
const MAX_YT_TIME = 150; // In seconds
// eslint-disable-next-line
const EMOJI_REGEX = /[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}\u{1f1e6}-\u{1f1ff}\u{1f191}-\u{1f251}\u{1f004}\u{1f0cf}\u{1f170}-\u{1f171}\u{1f17e}-\u{1f17f}\u{1f18e}\u{3030}\u{2b50}\u{2b55}\u{2934}-\u{2935}\u{2b05}-\u{2b07}\u{2b1b}-\u{2b1c}\u{3297}\u{3299}\u{303d}\u{00a9}\u{00ae}\u{2122}\u{23f3}\u{24c2}\u{23e9}-\u{23ef}\u{25b6}\u{23f8}-\u{23fa}]/ug;


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
 * @param {Function} cb - Callback function is called with a string of
 * any errors.
 */
const download = (url, fileName, extension, cb) => {
  const fullPath = `${PATH}/${fileName}.${extension}`;
  // Check if the file exists
  if (hasFile({fileName})) {
    return cb('File name already exists');
  }
  request.head(url, (err, res, body) => {
    if (err) {
      return cb(err);
    }
    request(url).pipe(fs.createWriteStream(fullPath)).on('close', cb);
  });
};

/**
 * Downloads the audio of a youtube video as an mp3 and saves it in the local
 * storage
 *
 * @param {String} url - URL of the audio to download
 * @param {String} fileName - The name to save the file as
 * @param {Function} cb - Callback function is called with a string of
 * any errors.
 */
const ytdownload = (url, fileName, cb) => {
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
    ffmpeg(stream)
      .audioBitrate(128)
      .save(`${PATH}/${fileName}.mp3`)
      .on('end', () => {
        cb();
      });
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

module.exports = {
  PATH,
  EMOJI_PATH,
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
};
