'use strict';
const { ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
const fs = require('fs');
const { PATH, makeEmbed, isDiscordCommand, getReplyFunction } = require('./util');
const USAGE = '`usage: [!rename/!rn] <oldName> <newName>`';

/**
 * Renames a file in the local storage space
 *
 * @param {String} oldName - The file to rename
 * @param {String} newName - The new name to give the file
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 */
const rename = (oldName, newName, message) => {
  const author = message?.author || message?.user
  let replyFunction = getReplyFunction(message);
  if (!isDiscordCommand(message))
    message.delete();
  const files = fs.readdirSync(PATH);
  if (!oldName) {
    message.channel.send(USAGE);
    return;
  }
  let oldFile;
  let newFile;
  // Find the file associated with the name
  for (let i = 0; i < files.length; i++) {
    if (files[i].substr(0, files[i].lastIndexOf('.')) === oldName) {
      oldFile = files[i];
    }
    if (files[i].substr(0, files[i].lastIndexOf('.')) === newName) {
      newFile = files[i];
    }
  }
  // If the file does not exist
  if (!oldFile) {
    replyFunction(`Could not find ${oldName}.`);
    return;
  } else if (newFile) {
    // All files should have unique names
    replyFunction('New file name already exists');
  } else {
    const exten = oldFile.substr(oldFile.lastIndexOf('.') + 1);
    const oldPath = `${PATH}/${oldFile}`;
    const newPath = `${PATH}/${newName}.${exten}`;
    fs.rename(oldPath, newPath, (err) => {
      if (err) {
        replyFunction('Could not rename file.');
        return;
      }
      replyFunction(
        makeEmbed({
          message: `Renamed ${oldName} to ${newName}`,
          user: author,
          member: message.guild.members.cache.get(author.id).displayName,
          color: message.guild.members.cache.get(author.id).displayColor,
        })
      );
    });
  }
};

const handleDiscordMessage = (message) => {
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];

  if (botCommand === '!rename' || botCommand === '!rn') {
    const oldFile = cmd[1];
    const newFile = cmd[2];
    rename(oldFile, newFile, message);
  }
};

const handleDiscordCommand = (interaction) => {
  if (interaction.commandName === 'rename') {
    const oldFile = interaction.options[0].value;
    const newFile = interaction.options[1].value;
    rename(oldFile, newFile, interaction);
  }
};

const commandData = [
  {
    name: 'rename',
    description: 'Renames a stored file.',
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        name: 'old_name',
        type: ApplicationCommandOptionType.String,
        autocomplete: true,
        description: 'The current file\'s name.',
        required: true
      },
      {
        name: 'new_name',
        type: ApplicationCommandOptionType.String,
        autocomplete: true,
        description: 'What you want to name the file.',
        required: true
      }
    ],
  }
];

const onText = (discordTrigger) => {
  if (isDiscordCommand(discordTrigger)) {
    handleDiscordCommand(discordTrigger);
  } else {
    handleDiscordMessage(discordTrigger);
  }
};

module.exports = {
  rename,
  onText,
  commandData,
};
