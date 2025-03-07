'use strict';
const { ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
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
      replyFunction(`Could not find ${fileName}.`);
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

const handleDiscordCommand = (interaction, bot) => {
  if (interaction.commandName === 'remove') {
    const fileName = interaction.options.get('file_name')?.value;
    remove({ fileName, message: interaction, emojis: bot.emojiTriggers, cb: () => {
      bot.emojiTriggers = JSON.parse(fs.readFileSync(EMOJI_PATH));
    }});
  }
};

const onText = (discordTrigger, bot) => {
  if (isDiscordCommand(discordTrigger)) {
    handleDiscordCommand(discordTrigger, bot);
  }
};

const commandData = [
  {
    name: 'remove',
    description: 'Removes a stored file.',
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        name: 'file_name',
        type: ApplicationCommandOptionType.String,
        autocomplete: false,
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
