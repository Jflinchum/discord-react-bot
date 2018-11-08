'use strict';
const fs = require('fs');
const { PATH } = require('./util');

/**
 * Finds all files using the regex and returns an array of them
 *
 * @param {String} regex - Regex to use for matching files
 * @param {Array} files - The array of file names to search through
 */
const findFiles = (regex, files) => {
  let response = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // Ignore hidden files
    if (file[0] === '.') {
      continue;
    }
    if (regex.test(file)) {
      response.push(file.substr(0, file.lastIndexOf('.')) + '\n');
    }
  }
  return response;
};

/**
 * Finds all files under the given file type and sends a list of them.
 * If no type is specified, list all files under each category.
 * The current categories are Image, Music, and Text
 *
 * @param {String} type - The local file to post
 * @param {String} message - The Discord Message Object that initiated
 * the command
 */
exports.list = (type, message) => {
  message.delete();
  const files = fs.readdirSync(PATH);
  let response = '```\n';
  const imageRegex = (/\.(gif|jpg|jpeg|tiff|png|mp4)$/i);
  const musicRegex = (/\.(mp3|wav)$/i);
  const textRegex = (/\.(txt|pdf)$/i);
  let imageList = [];
  let musicList = [];
  let textList = [];

  if (!type || type === 'image') {
    imageList = findFiles(imageRegex, files);
    if (imageList.length > 0) {
      response += 'Image:\n';
      response += '  ' + imageList.join('  ');
    }
  }
  if (!type || type === 'music') {
    musicList = findFiles(musicRegex, files);
    if (musicList.length > 0) {
      response += 'Music:\n';
      response += '  ' + musicList.join('  ');
    }
  }
  if (!type || type === 'text') {
    textList = findFiles(textRegex, files);
    if (textList.length > 0) {
      response += 'Text:\n';
      response += '  ' + textList.join(' ');
    }
  }


  response += '```';
  message.channel.send(response);
};
