'use strict';
const fs = require('fs');
const { PATH } = require('./util');

exports.list = (type, message) => {
  const files = fs.readdirSync(PATH);
  let regex = (/[\s\S]*/i);
  if (type) {
    switch (type.toLowerCase()) {
      case 'image':
        regex = (/\.(gif|jpg|jpeg|tiff|png)$/i);
        break;
      case 'music':
        regex = (/\.(mp3)$/i);
        break;
      case 'text':
        regex = (/\.(txt|pdf)$/i);
    }
  }
  let response = '```\n';
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // Ignore hidden files
    if (file[0] === '.') {
      continue;
    }
    if (regex.test(file)) {
      response += file.substr(0, file.lastIndexOf('.')) + '\n';
    }
  }
  response += '```';
  message.channel.send(response);
};
