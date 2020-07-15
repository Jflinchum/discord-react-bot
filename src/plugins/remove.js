'use strict';
const fs = require('fs');
const { PATH, EMOJI_PATH, removeJson, makeEmbed } = require('./util');
const USAGE = '`usage: [!remove/!r] <name>`';

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
    message.channel.send(USAGE);
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
      if (files[i].substr(0, files[i].lastIndexOf('.')).toLowerCase() ===
          fileName.toLowerCase()) {
        file = files[i];
        break;
      }
    }
    if (!file) {
      message.channel.send(`Could not find ${fileName}.`);
    } else {
      fs.unlink(`${PATH}/${file}`, () => {
        message.channel.send(
          makeEmbed(`Removed ${file}`, message.author)
        );
      });
    }
  }
};

const onText = (message, bot) => {
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];

  if (botCommand === '!remove' || botCommand === '!r') {
    // Delete any stored reactions
    const fileName = cmd.slice(1, cmd.length).join(' ');
    remove({ fileName, message, emojis: bot.emojiTriggers, cb: () => {
      bot.emojiTriggers = JSON.parse(fs.readFileSync(EMOJI_PATH));
    }});
  }
};

module.exports = {
  remove,
  onText,
};
