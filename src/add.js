'use strict';
const ytdl = require('ytdl-core');
const fs = require('fs');
const {
  PATH,
  MAX_YT_TIME,
  download,
  ytdownload,
  makeEmbed,
  hasFile,
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
 * @param {Number|Optional} startTime - The start time to go to for
 * music in seconds
 * @param {Number|Optional} stopTime - The stop time to trim to for
 * music in seconds
 */
const add = (fileName, url, exten, message, startTime, stopTime) => {
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
        const duration = (stopTime - startTime) ||
        (info.length_seconds - (startTime || 0));
        if (err) {
          console.log(err);
          msg.delete();
          message.channel.send('Could not get video info.');
          return;
        }
        // Check the length of the video
        if (info.length_seconds < MAX_YT_TIME
          || (duration && duration < MAX_YT_TIME)) {
          /**
           * Download the audio from the video as mp3
           *
           * Duration is either stopTime - startTime or
           * the video length - startTime/0
           */
          ytdownload({
            url,
            fileName,
            timeStart: startTime,
            duration,
            cb: () => {
              msg.delete();
              message.channel.send(
                makeEmbed(`Added ${info.title} as ${fileName}`, message.author)
              );
            },
          });
        } else {
          msg.delete();
          message.channel.send(
            'That video is too long! Keep it at 2:30 or below.'
          );
        }
      });
    } else {
      if (!exten) {
        msg.delete();
        message.channel.send('Could not find file extension');
      }
      // Download the file
      download({
        url,
        fileName,
        extension: exten,
        timeStart: startTime,
        timeStop: stopTime,
        cb: (err) => {
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
        },
      });
    }
  });
};

/**
 * Creates a text file in the local storage and writes the text into that file
 *
 * @param {String} fileName - The name to store the file as
 * @param {String} text - The text to store in the file
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 */
const addText = (fileName, text, message) => {
  if (hasFile({fileName})) {
    message.channel.send('File name already exists.');
    return;
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
