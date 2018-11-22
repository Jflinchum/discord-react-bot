'use strict';
const fs = require('fs');
const { PATH, EMOJI_PATH, removeJson, makeEmbed } = require('./util');

/**
 * Removes a file from the local storage
 *
 * @param {String} fileName - The file to delete from the local storage
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 * @param {Object} emojis - The emoji list for the bot to react with
 * @param {Function} cb - Callback function
 */
const remove = ({ fileName, message, emojis, cb }) => {
  message.delete();
  const files = fs.readdirSync(PATH);
  let file;
  if (!fileName) {
    message.channel.send('Please specify a name.');
  }
  if (emojis[fileName]) {
    // If the file is an emoji reaction
    removeJson({ path: EMOJI_PATH, key: fileName, cb: () => {
      message.channel.send(
        makeEmbed(`Removed ${fileName}`, message.author)
      );
      return cb();
    }});
    return;
  } else {
    // If it is a file
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
  }
};

module.exports = {
  remove,
};
