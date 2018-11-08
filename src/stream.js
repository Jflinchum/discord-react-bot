'use strict';
const ytdl = require('ytdl-core');
const { makeEmbed } = require('./util');

/**
 * Streams a youtube video's audio to a voice channel
 *
 * @param {String} url - The youtube url to stream
 * @param {String} channel - The voice channel to stream the video to
 * @param {String} message - The Discord Message Object that initiated
 * the command
 * @param {Object} bot - The Discord Client object that represents the bot
 */
exports.stream = (url, channel, message, bot) => {
  // Find the voice channel
  const channelList = bot.channels.array();
  let vc;
  for (let i = 0; i < channelList.length; i++) {
    if (channelList[i].type === 'voice'
      && channel.toLowerCase() === channelList[i].name.toLowerCase()) {
      vc = channelList[i];
    }
  }

  // Check if the url is valid
  if (!ytdl.validateURL(url)) {
    message.channel.send('Could not find youtube video.');
    return;
  }
  const ytStream = ytdl(url, { filter: 'audioonly' });

  // Check if the voice channel exists
  if (vc) {
    vc.join()
      .then((connection) => {
        // On connecting to a voice channel, play the youtube stream
        const dispatch = connection.playStream(ytStream);
        // Delete the command message
        message.delete();
        // Get the youtube video info and post who streamed what where
        ytdl.getBasicInfo(url, (err, info) => {
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
    message.channel.send('Could not find channel.');
    return;
  }
};
