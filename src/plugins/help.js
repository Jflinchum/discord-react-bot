'use strict';
const fs = require('fs');
const path = require('path');
const { sendTextBlock } = require('./util');

/**
 * Posts the contents of the help file to the channel
 *
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 * @param {Integer} page - The page number
 */
const help = (message, page) => {
  if (message.channel.type !== 'dm') {
    message.delete();
  }
  const helpText = fs.readFileSync(
    `${path.dirname(require.main.filename)}/help.txt`, 'utf8'
  );
  sendTextBlock({text: helpText, message, page});
};

const onText = (message) => {
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];
  if (botCommand === '!help' || botCommand === '!h') {
    // Post a help page
    const page = cmd[1];
    help(message, page);
  }
};

module.exports = {
  help,
  onText,
};
