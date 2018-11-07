'use strict';
const { download, ytdownload, COLOR } = require('./util');

exports.add = (fileName, url, exten, message) => {
  if (!fileName) {
    message.channel.send('Please specify a name.');
    return;
  }
  // Check for youtube videos
  if (url.includes('www.youtube.com') || url.includes('youtu.be')) {
    ytdownload(url, fileName, (msg) => {
      message.channel.send(msg);
    });
  } else {
    if (!exten) {
      message.channel.send('Could not find file extension');
    }
    download(url, fileName, exten, (err) => {
      if (err) {
        console.log(err);
        message.channel.send(err);
      } else {
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
};
