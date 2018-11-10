'use strict';
const fs = require('fs');
const { PATH, hasFile, makeEmbed } = require('./util');

/**
 * Appends text to a .txt file
 *
 * @param {String} fileName - The local file to append to
 * @param {String} text - The text to append
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 */
const append = ({fileName, text, message}) => {
  const fullPath = `${PATH}/${fileName}.txt`;
  if (!hasFile({ fileName })) {
    message.channel.send('Could not find text file.');
    return;
  }
  fs.appendFile(fullPath, text, (err) => {
    if (err) {
      message.channel.send('Could not append to file.');
      return;
    }
    message.channel.send(
      makeEmbed(`Added ${text} to ${fileName}`, message.author)
    );
  });
};


module.exports = {
  append,
};
