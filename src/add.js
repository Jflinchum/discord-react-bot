'use strict';
const ytdl = require('ytdl-core');
const fs = require('fs');
const {
  PATH,
  MAX_YT_TIME,
  download,
  ytdownload,
  makeEmbed,
} = require('./util');

/**
 * Adds a file to the local storage space. If the url is a youtube video,
 * it will download the audio and store it as an mp3. It will only download
 * youtube videos <= 2 minutes and 30 seconds
 *
 * @param {String} fileName - The name to store the file as
 * @param {String} url - The url of the file
 * @param {String} exten - The extension to save the file as
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 */
const add = (fileName, url, exten, message) => {
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

const addText = (fileName, text, message) => {
  const files = fs.readdirSync(PATH);
  // Check if the file already exists
  for (let i = 0; i < files.length; i++) {
    if (files[i].substr(0, files[i].lastIndexOf('.')) === fileName) {
      message.channel.send('File already exists.');
      return;
    }
  }
  fs.writeFile(`${PATH}/${fileName}.txt`, text, (err) => {
    if (err) {
      message.channel.send('Could not write the text to a file');
      return;
    }
    message.delete();
    message.channel.send(
      makeEmbed(`Added: ${fileName}`, message.author)
    );
  });
};

module.exports = {
  add,
  addText,
};
