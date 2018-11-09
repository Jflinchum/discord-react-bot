'use strict';
const request = require('request');
const fs = require('fs');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

const appDir = path.dirname(require.main.filename);
const PATH = `${appDir}/../reactions`;
const COLOR = 0x9400D3;
const MAX_YT_TIME = 150; // In seconds

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

module.exports = {
  PATH,
  COLOR,
  MAX_YT_TIME,
  makeEmbed,
  ytdownload,
  download,
  hasFile,
};
