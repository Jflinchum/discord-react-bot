'use strict';
const fs = require('fs');
const { PATH, makeEmbed } = require('./util');

/**
 * Removes a file from the local storage
 *
 * @param {String} fileName - The file to delete from the local storage
 * @param {String} message - The Discord Message Object that initiated
 * the command
 */
exports.remove = (fileName, message) => {
  message.delete();
  const files = fs.readdirSync(PATH);
  let file;
  if (!fileName) {
    message.channel.send('Please specify a name.');
  }
  // Iterate through and find the file to delete
  for (let i = 0; i < files.length; i++) {
    if (files[i].substr(0, files[i].lastIndexOf('.')) === fileName) {
      file = files[i];
      break;
    }
  }
  if (!file) {
    message.channel.send('Could not find file.');
  } else {
    fs.unlink(`${PATH}/${file}`, () => {
      message.channel.send(
        makeEmbed(`Removed ${file}`, message.author)
      );
    });
  }
};
