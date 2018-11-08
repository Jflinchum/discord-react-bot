'use strict';
const request = require('request');
const fs = require('fs');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

const appDir = path.dirname(require.main.filename);
const PATH = `${appDir}/../reactions`;
const COLOR = 0x9400D3;

exports.PATH = PATH;
exports.COLOR = COLOR;
exports.MAX_YT_TIME = 150; // In seconds

exports.makeEmbed = (message, user) => {
  return {
    embed: {
      thumbnail: {
        url: `${user.avatarURL}`,
      },
      color: COLOR,
      description: message,
      author: {
        name: user.username,
      },
    },
  };
};

exports.download = (url, fileName, extension, cb) => {
  const fullPath = `${PATH}/${fileName}.${extension}`;
  const files = fs.readdirSync(PATH);
  for (let i = 0; i < files.length; i++) {
    if (files[i].substr(0, files[i].lastIndexOf('.')) === fileName) {
      return cb('File name already exists');
    }
  }
  request.head(url, (err, res, body) => {
    if (err) {
      return cb(err);
    }
    request(url).pipe(fs.createWriteStream(fullPath)).on('close', cb);
  });
};

exports.ytdownload = (url, fileName, cb) => {
  const files = fs.readdirSync(PATH);
  for (let i = 0; i < files.length; i++) {
    if (files[i].includes(fileName)) {
      return cb('File name already exists');
    }
  }
  if (ytdl.validateURL(url)) {
    const stream = ytdl(url, {
      quality: 'highestaudio',
    });
    ffmpeg(stream)
      .audioBitrate(128)
      .save(`${PATH}/${fileName}.mp3`)
      .on('end', () => {
        cb(`Added ${fileName}`);
      });
    return;
  } else {
    return cb('Could not validate url.');
  }
};
