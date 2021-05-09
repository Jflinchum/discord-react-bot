'use strict';
const validUrl = require('valid-url');
const { isAdmin, isDiscordCommand } = require('./util');
const USAGE = '`usage: !changeIcon [url/attachment]`';

const reasonMessage = (message) => {
  const guild = message.guild;
  const author = message.author;
  const displayName = guild.member(author.id).displayName;
  return `${displayName} changed the guild icon with bot.`;
};

const handleDiscordMessage = (message) => {
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];
  if (botCommand === '!changeIcon') {
    if (isAdmin(message.author.id)) {
      const attachments = message.attachments.array();
      if (attachments.length > 0) {
        message.guild.setIcon(
          attachments[0].attachment,
          reasonMessage(message)
        );
      } else if (cmd.length > 1 && validUrl.isUri(cmd[1])) {
        message.guild.setIcon(
          cmd[1],
          reasonMessage(message)
        );
      } else {
        message.channel.send(USAGE);
      }
    } else {
      message.channel.send('`!changeIcon requires admin rights`');
    }
  }
};

const handleDiscordCommand = () => {

};

const onText = (discordTrigger) => {
  if (isDiscordCommand(discordTrigger)) {
    handleDiscordCommand(discordTrigger);
  } else {
    handleDiscordMessage(discordTrigger);
  }
};

module.exports = {
  onText,
};
