'use strict';

const { Client, Attachment } = require('discord.js');
const fs = require('fs');
const request = require('request');
const mkdirp = require('mkdirp');

const PATH = './reactions';
const TOKEN = process.env.DISCORD_TOKEN;

const download = (url, fileName, extension, cb) => {
  const fullPath = `${PATH}/${fileName}.${extension}`;
  mkdirp.sync(PATH);
  const files = fs.readdirSync(PATH);
  for (let i = 0; i < files.length; i++) {
    if (files[i].includes(fileName)) {
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

const bot = new Client();

bot.on('ready', () => {
  console.log('Logged in');
});


bot.on('message', message => {
  // Check to make sure the message is a command
  if (message.content[0] !== '!') {
    return;
  }
  // Split the command by spaces
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];
  // console.log(message);
  console.log(cmd);

  // Get any attachments associated with message
  const attach = message.attachments.array();

  // Adding files to bot list
  if (botCommand === '!add') {
    let fileName, url, exten;
    if (attach.length > 0) {
      // Handling attachment images
      fileName = cmd[1];
      url = attach[0].url;
    } else {
      // If the image is contained in url
      fileName = cmd[2];
      url = cmd[1];
    }
    // The extension of the file
    exten = url.substr((url.lastIndexOf('.') + 1));
    if (!fileName) {
      message.channel.send('Please specify a name.');
      return;
    } else if (!exten) {
      message.channel.send('Could not find file extension');
    }
    download(url, fileName, exten, (err) => {
      if (err) {
        message.channel.send(err);
      } else {
        message.channel.send('Successfully added!');
      }
    });
  } else if (botCommand === '!post') {
    // Posting files
    const files = fs.readdirSync(PATH);
    const name = cmd[1];
    let attach;
    // Find the file associated with the name
    for (let i = 0; i < files.length; i++) {
      if (files[i].includes(name)) {
        attach = new Attachment(`${PATH}/${files[i]}`);
      }
    }
    if (!attach) {
      message.channel.send('Could not find file.');
      return;
    }
    // Send the attachment
    message.channel.send(attach)
      .catch(() => {
        message.channel.send('Could not find file.');
      });
  } else if (botCommand === '!list') {
    // Listing files
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
  }
});

bot.login(TOKEN);
