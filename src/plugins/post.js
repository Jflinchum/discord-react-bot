'use strict';
const fs = require('fs');
const { MessageAttachment, MessageEmbed } = require('discord.js');
const { PATH, COLOR, makeEmbed, isDiscordCommand, getReplyFunction } = require('./util');
const USAGE = '`usage: [!post/!p] <name>`';

/**
 * Posts a file stored in the local storage space.
 * If the file is a text file, the bot will post the contents of the file
 * with text to speech enabled.
 *
 * @param {String} fileName - The local file to post
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 * @param {Object} bot - The Discord Client object that represents the bot
 */
const post = (fileName, message) => {
  const author = message?.author || message?.user
  let replyFunction = getReplyFunction(message);
  // Posting files
  if (!isDiscordCommand) {
    message.delete();
  }
  const files = fs.readdirSync(PATH);
  if (!fileName) {
    replyFunction(USAGE);
    return;
  }
  let file;
  // Find the file associated with the name
  for (let i = 0; i < files.length; i++) {
    if (files[i].substr(0, files[i].lastIndexOf('.')).toLowerCase() ===
        fileName.toLowerCase()) {
      file = files[i];
      break;
    }
  }
  if (!file) {
    replyFunction(`Could not find ${fileName}.`);
    return;
  }

  const exten = file.substr((file.lastIndexOf('.') + 1));
  // If we're not streaming to a voice channel, post the attachment
  const attach = new MessageAttachment(`${PATH}/${file}`);
  if (!attach) {
    replyFunction(`Could not find ${fileName}.`);
    return;
  }
  if (exten === 'mp3' || exten === 'wav') {
    // Audio files don't work with embeded messages, so send the attachments
    // afterwards
    replyFunction(
      makeEmbed({
        message: fileName,
        user: author,
        member: message.guild.members.cache.get(author.id).displayName,
        footerText: message.content,
        color: message.guild.members.cache.get(author.id).displayColor,
      })
    ).catch(() => {
      replyFunction('Could not find user posting.');
    });
    message.channel.send(attach);
  } else if (exten === 'txt') {
    // If the file is a text file, post the contents with text to speech
    const text = fs.readFileSync(`${PATH}/${file}`);
    /*
      First send the message with text to speech enabled, then delete it and
      Send the embeded message style. This work around is because text to
      speech does not work on embeded messages.
    */
    replyFunction(text, {
      tts: true,
    })
      .then(msg => {
        if (msg) {
          msg.delete();
        }
        replyFunction(
          makeEmbed({
            message: text.toString(),
            user: author,
            member: message.guild.members.cache.get(author.id).displayName,
            footerText: message.content,
            color: message.guild.members.cache.get(author.id).displayColor,
          })
        );
      });
  } else {
    let messageEmbed = new MessageEmbed();
    messageEmbed.setThumbnail(author.displayAvatarURL({ dynamic: true }))
    messageEmbed.setImage(`attachment://${file}`);
    messageEmbed.setColor(message.guild.members.cache.get(author.id).displayColor || COLOR);
    messageEmbed.setAuthor(message.guild.members.cache.get(author.id).displayName);
    messageEmbed.setFooter(message.cleanContent || '');
    messageEmbed.attachFiles([{
      attachment: `${PATH}/${file}`,
      name: file,
    }]);
    if (message?.isCommand?.()) {
      message.defer();
      message.editReply(messageEmbed);
    } else {
      // Send the attachment
      replyFunction(messageEmbed)
        .catch(() => {
          replyFunction('Could not find user posting.');
        });
    }
  }
};

const handleDiscordMessage = (message, bot) => {
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];
  if (botCommand === '!post' || botCommand === '!p') {
    // Posting an image
    const fileName = cmd[1];
    if (!fileName) {
      message.channel.send(USAGE);
      return;
    }

    post(fileName, message, bot);
  }
};

const handleDiscordCommand = (interaction, bot) => {
  if (interaction.commandName === 'post') {
    const fileName = interaction.options[0].value;
    post(fileName, interaction, bot);
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
    name: 'post',
    description: 'Post a file to the current channel',
    options: [
      {
        name: 'file_name',
        type: 'STRING',
        description: 'The name of the file you want to post',
        required: true,
      }
    ],
  }
];

module.exports = {
  post,
  onText,
  commandData,
};
