'use strict';
const fs = require('fs');
const { PATH, hasFile, makeEmbed } = require('./util');
const USAGE = '`usage: !append <name> <"Example Text">`';

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
  if (!hasFile({ fileName, caseSensitive: true })) {
    message.channel.send('Could not find text file.');
    return;
  }
  fs.appendFile(fullPath, text, (err) => {
    if (err) {
      message.channel.send('Could not append to file.');
      return;
    }
    message.channel.send(
      makeEmbed({
        message: `Added ${text} to ${fileName}`,
        user: message.author,
      })
    );
  });
};

const onText = (message) => {
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];

  if (botCommand === '!append') {
    const fileName = cmd[1];
    let text = cmd.slice(2, cmd.length).join(' ');
    if (text[0] !== '"' || text[text.length - 1] !== '"') {
      message.channel.send(USAGE);
      return;
    }
    if (!fileName) {
      message.channel.send(USAGE);
      return;
    }
    text = text.slice(1, text.length - 1);
    append({fileName, text, message});
  }
};


module.exports = {
  append,
  onText,
};
