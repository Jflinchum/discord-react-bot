'use strict';
const fs = require('fs');
const path = require('path');
const { sendTextBlock, isDiscordCommand } = require('./util');

/**
 * Posts the contents of the help file to the channel
 *
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 * @param {Integer} page - The page number
 */
const help = (message, page) => {
  if (message.channel.type !== 'dm' && !isDiscordCommand(message)) {
    message.delete();
  }
  const helpText = fs.readFileSync(
    `${path.dirname(require.main.filename)}/help.txt`, 'utf8'
  );
  sendTextBlock({text: helpText, message, page});
};

const handleDiscordMessage = (message) => {
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];
  if (botCommand === '!help' || botCommand === '!h') {
    // Post a help page
    const page = cmd[1];
    help(message, page);
  }
};

const handleDiscordCommand = (interaction) => {
  if (interaction.commandName === 'help')
    help(interaction, interaction?.options[0]?.value);
};

const onText = (discordTrigger) => {
  if (isDiscordCommand(discordTrigger)) {
    handleDiscordCommand(discordTrigger);
  } else {
    handleDiscordMessage(discordTrigger);
  }
};

const commandData = [{
  name: 'help',
  description: 'Lists out all possible commands.',
  options: [{
    name: 'page',
    type: 'INTEGER',
    description: 'The page of the help list',
    required: false,
  }],
}];

module.exports = {
  help,
  onText,
  commandData,
};
