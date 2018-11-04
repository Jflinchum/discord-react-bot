'use strict';

const discord = require('discord.js');
const token = process.env.DISCORD_TOKEN;
console.log(token);

const bot = new discord.Client();

bot.on('ready', () => {
  console.log('Logged in');
});

bot.on('message', message => {
  if (message.content[0] !== '!') {
    return;
  }
  let cmd = message.content.split(' ');
  console.log(message);
  console.log(cmd);
  const attach = message.attachments.array();
  if (cmd[0] === '!add') {
    if (attach.length > 0) {
      console.log(attach);
    } else {
      console.log(cmd[1]);
    }
  }
});

bot.login(token);
