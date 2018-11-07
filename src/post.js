'use strict';
const fs = require('fs');
const { Attachment } = require('discord.js');
const { PATH, COLOR } = require('./util');

exports.post = (fileName, channel, message, bot) => {
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
  // Check to see if mp3 should be played in a channel
  if (exten === 'mp3' && channel) {
    const channelList = bot.channels.array();
    let vc;
    for (let i = 0; i < channelList.length; i++) {
      if (channelList[i].type === 'voice'
          && channel === channelList[i].name) {
        vc = channelList[i];
      }
    }
    // Check if the voice channel exists
    if (!vc) {
      message.channel.send('Could not find voice channel.');
      return;
    }
    vc.join()
      .then((connection) => {
        const dispatch = connection.playFile(`${PATH}/${file}`);
        message.channel.send({
          embed: {
            thumbnail: {
              url: `${message.author.avatarURL}`,
            },
            description: `Playing: ${file}\nTo: ${channel}`,
            color: COLOR,
            author: {
              name: message.author.username,
            },
          },
        });
        dispatch.on('end', () => {
          vc.leave();
        });
      })
      .catch((err) => {
        message.channel.send('Could not join channel.');
        console.log(err);
      });
  } else {
    const attach = new Attachment(`${PATH}/${file}`);
    if (!attach) {
      message.channel.send('Could not find file.');
      return;
    }

    // Send the attachment
    message.channel.send({
      embed: {
        thumbnail: {
          url: `${message.author.avatarURL}`,
        },
        image: {
          url: `attachment://${file}`,
        },
        color: 0x9400D3,
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
