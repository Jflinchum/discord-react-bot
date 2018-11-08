'use strict';
const ytdl = require('ytdl-core');
const fs = require('fs');
const { PATH, makeEmbed } = require('./util');

exports.play = (channel, media, message, bot) => {
  if (!channel) {
    message.channel.send('Please specify a channel name.');
    return;
  }
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
  if (!media) {
    // For attachments
    const attach = message.attachments.array();
    if (attach.length === 0) {
      message.channel.send('Please specify music to play.');
      return;
    }
    vc.join()
      .then((connection) => {
        // On connecting to a voice channel, play the youtube stream
        const dispatch = connection.playArbitraryInput(attach[0].url);
        // Delete the command message
        message.delete();
        message.channel.send(
          makeEmbed(
            `Playing: ${attach[0].filename}\nTo: ${channel}`,
            message.author)
        );
        // Get the youtube video info and post who streamed what where
        dispatch.on('end', () => {
          // Leave the voice channel after finishing the stream
          vc.leave();
        });
      })
      .catch((err) => {
        message.channel.send('Could not join channel.');
        console.log(err);
      });
  } else if (media.includes('www.youtube.com') || media.includes('youtu.be')) {
    // For youtube video streaming
    // Check if the url is valid
    if (!ytdl.validateURL(media)) {
      message.channel.send('Could not find youtube video.');
      return;
    }
    const ytStream = ytdl(media, { filter: 'audioonly' });
    // Join the voice channel
    vc.join()
      .then((connection) => {
        // On connecting to a voice channel, play the youtube stream
        const dispatch = connection.playStream(ytStream);
        // Delete the command message
        message.delete();
        // Get the youtube video info and post who streamed what where
        ytdl.getBasicInfo(media, (err, info) => {
          if (err)
            console.log(err);
          message.channel.send(
            makeEmbed(`Playing: ${info.title}\nTo: ${channel}`, message.author)
          );
        });
        dispatch.on('end', () => {
          // Leave the voice channel after finishing the stream
          vc.leave();
        });
      })
      .catch((err) => {
        message.channel.send('Could not join channel.');
        console.log(err);
      });
  } else {
    // For playing local files
    const files = fs.readdirSync(PATH);
    let file;
    // Find the file associated with the name
    for (let i = 0; i < files.length; i++) {
      if (files[i].substr(0, files[i].lastIndexOf('.')) === media) {
        file = files[i];
        break;
      }
    }
    if (!file) {
      message.channel.send('Could not find file.');
      return;
    }
    const exten = file.substr((file.lastIndexOf('.') + 1));
    if (exten !== 'mp3' && exten !== 'wav') {
      message.channel.send('File is not categorized as music.');
      return;
    }
    // Join the voice channel
    vc.join()
      .then((connection) => {
        const dispatch = connection.playFile(`${PATH}/${file}`);
        message.channel.send(
          makeEmbed(`Playing: ${media}\nTo: ${channel}`, message.author)
        );
        dispatch.on('end', () => {
          vc.leave();
        });
      })
      .catch((err) => {
        message.channel.send('Could not join channel.');
        console.log(err);
      });
  }
};
