'use strict';
const fs = require('fs');
const { PATH } = require('./util');

exports.list = (type, message) => {
  const files = fs.readdirSync(PATH);
  let response = '```\n';
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // Ignore hidden files
    if (file[0] === '.') {
      continue;
    }
    response += file.substr(0, file.lastIndexOf('.')) + '\n';
  }
  response += '```';
  message.channel.send(response);
};
