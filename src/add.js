'use strict';
const ytdl = require('ytdl-core');
const { download, ytdownload, MAX_YT_TIME, makeEmbed } = require('./util');

/**
 * Adds a file to the local storage space. If the url is a youtube video,
 * it will download the audio and store it as an mp3. It will only download
 * youtube videos <= 2 minutes and 30 seconds
 *
 * @param {String} fileName - The name to store the file as
 * @param {String} url - The url of the file
 * @param {String} exten - The extension to save the file as
 * @param {String} message - The Discord Message Object that initiated
 * the command
 */
exports.add = (fileName, url, exten, message) => {
  // Send a loading message that will get deleted later since
  // downloading can take a while
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
        // Check the length of the video
        if (info.length_seconds >= MAX_YT_TIME) {
          msg.delete();
          message.channel.send(
            'That video is too long! Keep it at 2:30 or below.'
          );
        } else {
          // Download the audio from the video as mp3
          ytdownload(url, fileName, () => {
            msg.delete();
            message.channel.send(
              makeEmbed(`Added ${info.title} as ${fileName}`, message.author)
            );
          });
        }
      });
    } else {
      if (!exten) {
        msg.delete();
        message.channel.send('Could not find file extension');
      }
      // Download the file
      download(url, fileName, exten, (err) => {
        if (err) {
          console.log(err);
          msg.delete();
          message.channel.send(err);
        } else {
          msg.delete();
          message.channel.send(
            makeEmbed(`Added: ${fileName}`, message.author)
          );
        }
      });
    }
  });
};
