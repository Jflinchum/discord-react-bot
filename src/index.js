'use strict';

const { Client } = require('discord.js');
const mkdirp = require('mkdirp');
const fs = require('fs');
const { PATH, EMOJI_PATH, EMOJI_REGEX, removeJson } = require('./plugins/util');
const { onTextHooks } = require('./plugins');
const TOKEN = process.env.DISCORD_TOKEN;

const bot = new Client();
fs.exists(EMOJI_PATH, (exists) => {
  if (!exists) {
    fs.writeFileSync(EMOJI_PATH, '{}');
  }
  let emojiTriggers = JSON.parse(fs.readFileSync(EMOJI_PATH));
  bot.emojiTriggers = emojiTriggers;
});

bot.on('ready', () => {
  console.log('Logged in');
  mkdirp.sync(PATH);
  Object.keys(bot.emojiTriggers).map((triggerWord) => {
    for (let index in bot.emojiTriggers[triggerWord]) {
      let emojiObj = bot.emojiTriggers[triggerWord][index];
      if (!EMOJI_REGEX.test(emojiObj.emoji) &&
      !bot.guilds.array()[0].emojis.get(emojiObj.emoji)) {
        removeJson({ path: EMOJI_PATH, key: triggerWord });
        delete bot.emojiTriggers[triggerWord];
      }
    }
  });
});


bot.on('message', message => {
  // Ignore bot commands
  if (message.author.bot) {
    return;
  }
  // React with any emojis
  const emojiKeys = Object.keys(bot.emojiTriggers);
  for (let i = 0; i < emojiKeys.length; i++) {
    if (message.content.toLowerCase().includes(emojiKeys[i])) {
      const random = Math.random();
      let emojiArray = bot.emojiTriggers[emojiKeys[i]];
      emojiArray.forEach((emojiChance) => {
        if (emojiChance.chance >= random && !message.deleted) {
          message.react(emojiChance.emoji).catch((err) => {
            console.log(err);
          });
        }
      });
    }
  }
  // Check to make sure the message is a command
  if (message.content[0] !== '!') {
    return;
  }
  // Split the command by spaces
  const cmd = message.content.split(' ');
  console.log(cmd);
  onTextHooks.map((onTextFunc) => {
    onTextFunc(message, bot);
  });
});

bot.login(TOKEN);
