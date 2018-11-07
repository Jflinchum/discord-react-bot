'use strict';
const fs = require('fs');
const { PATH } = require('./util');

const findFiles = (regex, files) => {
  let response = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // Ignore hidden files
    if (file[0] === '.') {
      continue;
    }
    if (regex.test(file)) {
      response.push(file.substr(0, file.lastIndexOf('.')) + '\n');
    }
  }
  return response;
};

exports.list = (type, message) => {
  const files = fs.readdirSync(PATH);
  let response = '```\n';
  const imageRegex = (/\.(gif|jpg|jpeg|tiff|png|mp4)$/i);
  const musicRegex = (/\.(mp3)$/i);
  const textRegex = (/\.(txt|pdf)$/i);
  let imageList = [];
  let musicList = [];
  let textList = [];

  if (!type || type === 'image') {
    imageList = findFiles(imageRegex, files);
    if (imageList.length > 0) {
      response += 'Image:\n';
      response += '  ' + imageList.join('  ');
    }
  }
  if (!type || type === 'music') {
    musicList = findFiles(musicRegex, files);
    if (musicList.length > 0) {
      response += 'Music:\n';
      response += '  ' + musicList.join('  ');
    }
  }
  if (!type || type === 'text') {
    textList = findFiles(textRegex, files);
    if (textList.length > 0) {
      response += 'Text:\n';
      response += '  ' + textList.join(' ');
    }
  }


  response += '```';
  message.channel.send(response);
};
