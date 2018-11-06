'use strict';

const { Client } = require('discord.js');
const mkdirp = require('mkdirp');
const { add } = require('./add');
const { post } = require('./post');
const { list } = require('./list');
const { remove } = require('./remove');
const { help } = require('./help');
const { PATH } = require('./util');
const TOKEN = process.env.DISCORD_TOKEN;

const bot = new Client();

bot.on('ready', () => {
  console.log('Logged in');
  mkdirp.sync(PATH);
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
    let url, fileName, exten;
    if (attach.length > 0) {
      // Handling attachment images
      fileName = cmd[1];
      url = attach[0].url;
    } else {
      // If the image is contained in url
      fileName = cmd[2];
      url = cmd[1];
    }
    if (!fileName) {
      message.channel.send('Please specify a name.');
      return;
    }
    exten = url.substr((url.lastIndexOf('.') + 1));
    if (!exten) {
      message.channel.send('Could not find file extension');
    }
    add(fileName, url, exten, message);
  } else if (botCommand === '!post') {
    const fileName = cmd[1];
    const channel = cmd[2];
    if (!fileName) {
      message.channel.send('Please specify a name.');
      return;
    }
    post(fileName, channel, message, bot);
  } else if (botCommand === '!list') {
    // Listing files
    list(message);
  } else if (botCommand === '!leave') {
    // Leave any voice channels the bot is currently in
    bot.voiceConnections.array().forEach((vc) => {
      vc.channel.leave();
    });
  } else if (botCommand === '!remove') {
    // Delete any stored reactions
    const fileName = cmd[1];
    remove(fileName, message);
  } else if (botCommand === '!help') {
    help(message);
  }
});

bot.login(TOKEN);
