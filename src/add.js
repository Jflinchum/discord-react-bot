'use strict';
const ytdl = require('ytdl-core');
const { download, ytdownload, COLOR, MAX_YT_TIME } = require('./util');

exports.add = (fileName, url, exten, message) => {
  message.channel.send('Loading...').then(msg => {
    if (!fileName) {
      msg.delete();
      message.channel.send('Please specify a name.');
      return;
    }
    // Check for youtube videos
    if (url.includes('www.youtube.com') || url.includes('youtu.be')) {
      ytdl.getBasicInfo(url, (err, info) => {
        if (err) {
          console.log(err);
          msg.delete();
          message.channel.send('Could not get video info.');
          return;
        }
        if (info.length_seconds >= MAX_YT_TIME) {
          msg.delete();
          message.channel.send(
            'That video is too long! Keep it at 2:30 or below.'
          );
        } else {
          ytdownload(url, fileName, () => {
            msg.delete();
            message.channel.send({
              embed: {
                thumbnail: {
                  url: `${message.author.avatarURL}`,
                },
                description: `Added ${info.title} as ${fileName}`,
                color: COLOR,
                author: {
                  name: message.author.username,
                },
              },
            });
          });
        }
      });
    } else {
      if (!exten) {
        msg.delete();
        message.channel.send('Could not find file extension');
      }
      download(url, fileName, exten, (err) => {
        if (err) {
          console.log(err);
          msg.delete();
          message.channel.send(err);
        } else {
          msg.delete();
          message.channel.send({
            embed: {
              thumbnail: {
                url: `${message.author.avatarURL}`,
              },
              description: `Added: ${fileName}`,
              color: COLOR,
              author: {
                name: message.author.username,
              },
            },
          });
        }
      });
    }
  });
};
