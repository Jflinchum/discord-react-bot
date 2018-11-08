'use strict';
const fs = require('fs');
const { PATH, makeEmbed } = require('./util');

exports.remove = (fileName, message) => {
  message.delete();
  const files = fs.readdirSync(PATH);
  let file;
  if (!fileName) {
    message.channel.send('Please specify a name.');
  }
  // Iterate through and find the file to delete
  for (let i = 0; i < files.length; i++) {
    if (files[i].substr(0, files[i].lastIndexOf('.')) === fileName) {
      file = files[i];
      break;
    }
  }
  if (!file) {
    message.channel.send('Could not find file.');
  } else {
    fs.unlink(`${PATH}/${file}`, () => {
      message.channel.send(
        makeEmbed(`Removed ${file}`, message.author)
      );
    });
  }
};
