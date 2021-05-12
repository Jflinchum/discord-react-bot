'use strict';
const fs = require('fs');
const { PATH, hasFile, makeEmbed, isDiscordCommand, getReplyFunction } = require('./util');
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
  const author = message?.author || message?.user;
  let replyFunction = getReplyFunction(message);
  const fullPath = `${PATH}/${fileName}.txt`;
  if (!hasFile({ fileName, caseSensitive: true })) {
    replyFunction('Could not find text file.');
    return;
  }
  fs.appendFile(fullPath, text, (err) => {
    if (err) {
      replyFunction('Could not append to file.');
      return;
    }
    replyFunction(
      makeEmbed({
        message: `Added ${text} to ${fileName}`,
        user: author,
        member: message.guild.members.cache.get(author.id).displayName,
        color: message.guild.members.cache.get(author.id).displayColor,
      })
    );
  });
};

const handleDiscordMessage = (message) => {
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

const handleDiscordCommand = (interaction) => {
  if (interaction.commandName === 'append') {
    const fileName = interaction.options[0]?.value;
    const text = interaction.options[1]?.value;
    append({ fileName, text, message: interaction });
  }
};

const onText = (discordTrigger) => {
  if (isDiscordCommand(discordTrigger)) {
    handleDiscordCommand(discordTrigger);
  } else {
    handleDiscordMessage(discordTrigger);
  }
};

const commandData = [
  {
    name: 'append',
    description: 'Appends text to a stored text file.',
    options: [
      {
        name: 'file_name',
        type: 'STRING',
        description: 'The name of the file you want to append the text to.',
        required: true,
      },
      {
        name: 'text',
        type: 'STRING',
        description: 'The text you want to append.',
        required: true,
      }
    ],
  }
];

module.exports = {
  append,
  onText,
  commandData,
};
