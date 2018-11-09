'use strict';
const fs = require('fs');
const { Attachment } = require('discord.js');
const { PATH, COLOR, makeEmbed } = require('./util');

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
    message.channel.send('Please specify a name.');
    return;
  }
  let file;
  // Find the file associated with the name
  for (let i = 0; i < files.length; i++) {
    if (files[i].substr(0, files[i].lastIndexOf('.')) === fileName) {
      file = files[i];
      break;
    }
  }
  if (!file) {
    message.channel.send('Could not find file.');
    return;
  }

  const exten = file.substr((file.lastIndexOf('.') + 1));
  // If we're not streaming to a voice channel, post the attachment
  const attach = new Attachment(`${PATH}/${file}`);
  if (!attach) {
    message.channel.send('Could not find file.');
    return;
  }
  if (exten === 'mp3' || exten === 'wav') {
    // Audio files don't work with embeded messages, so send the attachments
    // afterwards
    message.channel.send(
      makeEmbed(fileName, message.author)
    )
      .catch(() => {
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
          makeEmbed(text.toString(), message.author)
        );
      });
  } else {
    // Send the attachment
    message.channel.send({
      embed: {
        thumbnail: {
          url: `${message.author.avatarURL}`,
        },
        image: {
          url: `attachment://${file}`,
        },
        color: COLOR,
        author: {
          name: message.author.username,
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

module.exports = {
  post,
};
