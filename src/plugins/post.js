'use strict';
const fs = require('fs');
const { MessageAttachment } = require('discord.js');
const { PATH, COLOR, makeEmbed } = require('./util');
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
const post = (fileName, message, bot) => {
  // Posting files
  message.delete();
  const files = fs.readdirSync(PATH);
  if (!fileName) {
    message.channel.send(USAGE);
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
    message.channel.send(`Could not find ${fileName}.`);
    return;
  }

  const exten = file.substr((file.lastIndexOf('.') + 1));
  // If we're not streaming to a voice channel, post the attachment
  const attach = new MessageAttachment(`${PATH}/${file}`);
  if (!attach) {
    message.channel.send(`Could not find ${fileName}.`);
    return;
  }
  if (exten === 'mp3' || exten === 'wav') {
    // Audio files don't work with embeded messages, so send the attachments
    // afterwards
    message.channel.send(
      makeEmbed({
        message: fileName,
        user: message.author,
        member: message.guild.member(message.author.id).displayName,
        footerText: message.content,
        color: message.guild.member(message.author.id).displayColor,
      })
    ).catch(() => {
      message.channel.send('Could not find user posting.');
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
    message.channel.send(text, {
      tts: true,
    })
      .then(msg => {
        msg.delete();
        message.channel.send(
          makeEmbed({
            message: text.toString(),
            user: message.author,
            member: message.guild.member(message.author.id).displayName,
            footerText: message.content,
            color: message.guild.member(message.author.id).displayColor,
          })
        );
      });
  } else {
    // Send the attachment
    message.channel.send({
      embed: {
        thumbnail: {
          url: `${message.author.displayAvatarURL({ dynamic: true })}`,
        },
        image: {
          url: `attachment://${file}`,
        },
        color: message.guild.member(message.author.id).displayColor || COLOR,
        author: {
          name: message.guild.member(message.author.id).displayName,
        },
        footer: {
          text: message.cleanContent,
        },
      },
      files: [{
        attachment: `${PATH}/${file}`,
        name: file,
      }],
    })
      .catch(() => {
        message.channel.send('Could not find user posting.');
      });
  }
};

const onText = (message, bot) => {
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

module.exports = {
  post,
  onText,
};
