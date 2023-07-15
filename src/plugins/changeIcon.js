'use strict';
const { ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
const validUrl = require('valid-url');
const { isAdmin, isDiscordCommand, getReplyFunction } = require('./util');
const USAGE = '`usage: !changeIcon [url/attachment]`';

const reasonMessage = (message, author) => {
  const guild = message.guild;
  const displayName = guild.members.cache.get(author.id).displayName;
  return `${displayName} changed the guild icon with bot.`;
};

const changeGuildIcon = (icon, message) => {
  const author = message?.author || message?.user
  message.guild.setIcon(
    icon,
    reasonMessage(message, author)
  );
}

const handleDiscordMessage = (message) => {
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];
  if (botCommand === '!changeIcon') {
    if (isAdmin(message.author.id)) {
      const attachments = message.attachments.array();
      if (attachments.length > 0) {
        changeGuildIcon(attachments[0].attachment, message)
      } else if (cmd.length > 1 && validUrl.isUri(cmd[1])) {
        changeGuildIcon(cmd[1], message);
      } else {
        message.channel.send(USAGE);
      }
    } else {
      message.channel.send('`!changeIcon requires admin rights`');
    }
  }
};

const handleDiscordCommand = (interaction) => {
  let replyFunction = getReplyFunction(interaction);
  if (interaction.commandName === 'change_icon') {
    const link = interaction.options[0]?.value;
    if (isAdmin(interaction.user.id)) {
      if (validUrl.isUri(link)) {
        interaction.reply('Changing guild icon.');
        changeGuildIcon(link, interaction);
      } else {
        replyFunction('Not a valid url.');
      }
    } else {
      replyFunction('This command requires admin rights.');
    }
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
    name: 'change_icon',
    description: 'Changes the icon of the server. Restricted to admins only.',
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        name: 'image_url',
        type: ApplicationCommandOptionType.String,
        autocomplete: true,
        description: 'A link to the file you want to change the icon to.',
        required: true,
      }
    ],
  }
];

module.exports = {
  onText,
  commandData,
};
