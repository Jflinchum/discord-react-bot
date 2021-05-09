'use strict';
const fs = require('fs');
const {
  PATH,
  EMOJI_PATH,
  removeJson,
  makeEmbed,
  splitArgsWithQuotes,
  isDiscordCommand,
} = require('./util');
const USAGE = '`usage: [!remove/!r] "<name>"`';

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
    return;
  }
  if (emojis[fileName]) {
    // If the file is an emoji reaction
    removeJson({ path: EMOJI_PATH, key: fileName, cb: () => {
      message.channel.send(
        makeEmbed({
          message: `Removed ${fileName}`,
          user: message.author,
          member: message.guild.member(message.author.id).displayName,
          color: message.guild.member(message.author.id).displayColor,
        })
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
          makeEmbed({
            message: `Removed ${file}`,
            user: message.author,
            member: message.guild.member(message.author.id).displayName,
            color: message.guild.member(message.author.id).displayColor,
          })
        );
      });
    }
  }
};

const handleDiscordMessage = (message, bot) => {
  const cmd = splitArgsWithQuotes(message.content);
  const botCommand = cmd[0];

  if (botCommand === '!remove' || botCommand === '!r') {
    // Delete any stored reactions
    const fileName = (cmd[1] || '').replace(/"/g, '');
    remove({ fileName, message, emojis: bot.emojiTriggers, cb: () => {
      bot.emojiTriggers = JSON.parse(fs.readFileSync(EMOJI_PATH));
    }});
  }
};

const handleDiscordCommand = () => {

};

const onText = (discordTrigger, bot) => {
  if (isDiscordCommand(discordTrigger)) {
    handleDiscordCommand(discordTrigger);
  } else {
    handleDiscordMessage(discordTrigger, bot);
  }
};

module.exports = {
  remove,
  onText,
};
