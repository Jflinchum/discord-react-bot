'use strict';
const ytdl = require('ytdl-core');
const { COLOR } = require('./util');

exports.stream = (url, channel, message, bot) => {
  const channelList = bot.channels.array();
  let vc;
  for (let i = 0; i < channelList.length; i++) {
    if (channelList[i].type === 'voice'
      && channel === channelList[i].name) {
      vc = channelList[i];
    }
  }

  if (!ytdl.validateURL(url)) {
    message.channel.send('Could not find youtube video.');
    return;
  }
  const ytStream = ytdl(url, { filter: 'audioonly' });

  // Check if the voice channel exists
  if (vc) {
    vc.join()
      .then((connection) => {
        const dispatch = connection.playStream(ytStream);
        message.delete();
        ytdl.getBasicInfo(url, (err, info) => {
          if (err)
            console.log(err);
          console.log(info);
          message.channel.send({
            embed: {
              thumbnail: {
                url: `${message.author.avatarURL}`,
              },
              description: `Playing: ${info.title}\nTo: ${channel}`,
              color: COLOR,
              author: {
                name: message.author.username,
              },
            },
          });
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
    message.channel.send('Could not find channel.');
    return;
  }
};
