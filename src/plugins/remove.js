'use strict';
const fs = require('fs');
const {
  PATH,
  EMOJI_PATH,
  removeJson,
  makeEmbed,
  splitArgsWithQuotes,
  isDiscordCommand,
  getReplyFunction,
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
  if (!isDiscordCommand(message))
    message.delete();
  const author = message?.author || message?.user
  let replyFunction = getReplyFunction(message);
  const files = fs.readdirSync(PATH);
  let file;
  if (!fileName) {
    replyFunction(USAGE);
    return;
  }
  if (emojis[fileName]) {
    // If the file is an emoji reaction
    removeJson({ path: EMOJI_PATH, key: fileName, cb: () => {
      replyFunction(
        makeEmbed({
          message: `Removed ${fileName}`,
          user: author,
          member: message.guild.members.cache.get(author.id).displayName,
          color: message.guild.members.cache.get(author.id).displayColor,
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
        replyFunction(
          makeEmbed({
            message: `Removed ${file}`,
            user: author,
            member: message.guild.members.cache.get(author.id).displayName,
            color: message.guild.members.cache.get(author.id).displayColor,
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

const handleDiscordCommand = (interaction, bot) => {
  if (interaction.commandName === 'remove') {
    const fileName = interaction.options[0]?.value;
    remove({ fileName, message: interaction, emojis: bot.emojiTriggers, cb: () => {
      bot.emojiTriggers = JSON.parse(fs.readFileSync(EMOJI_PATH));
    }});
  }
};

const onText = (discordTrigger, bot) => {
  if (isDiscordCommand(discordTrigger)) {
    handleDiscordCommand(discordTrigger, bot);
  } else {
    handleDiscordMessage(discordTrigger, bot);
  }
};

const commandData = [
  {
    name: 'remove',
    description: 'Removes a stored file.',
    options: [
      {
        name: 'file_name',
        type: 'STRING',
        description: 'The name of the file you want to remove',
        required: true,
      }
    ],
  }
];

module.exports = {
  remove,
  onText,
  commandData,
};
