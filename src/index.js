'use strict';

const { Client } = require('discord.js');
const mkdirp = require('mkdirp');
const fs = require('fs');
const { add, addText } = require('./add');
const { post } = require('./post');
const { list } = require('./list');
const { remove } = require('./remove');
const { help } = require('./help');
const { markovUser, markovChannel } = require('./markov');
const { rename } = require('./rename');
const { play, queue, skip } = require('./play');
const { append } = require('./append');
const { trigger } = require('./trigger');
const { promptGpt2, promptRelevanceGpt2 } = require('./gpt2');
const { PATH, EMOJI_PATH, EMOJI_REGEX } = require('./util');
const TOKEN = process.env.DISCORD_TOKEN;

const bot = new Client();
let emojiTriggers;
fs.exists(EMOJI_PATH, (exists) => {
  if (!exists) {
    fs.writeFileSync(EMOJI_PATH, '{}');
  }
  emojiTriggers = JSON.parse(fs.readFileSync(EMOJI_PATH));
});

bot.on('ready', () => {
  console.log('Logged in');
  mkdirp.sync(PATH);
});


bot.on('message', message => {
  // Ignore bot commands
  if (message.author.bot) {
    return;
  }
  // React with any emojis
  const emojiKeys = Object.keys(emojiTriggers);
  for (let i = 0; i < emojiKeys.length; i++) {
    if (message.content.toLowerCase().includes(emojiKeys[i])) {
      const random = Math.random();
      let emojiArray = emojiTriggers[emojiKeys[i]];
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
  const botCommand = cmd[0];
  // console.log(message);
  console.log(cmd);

  // Get any attachments associated with message
  const attach = message.attachments.array();

  // Adding files to bot list
  if (botCommand === '!add' || botCommand === '!a') {
    let url, fileName, exten, timeStart, timeStop;
    if (attach.length > 0) {
      // Handling attachment images
      fileName = cmd[1];
      url = attach[0].url;
      timeStart = cmd[2];
      timeStop = cmd[3];
    } else {
      // If the image is contained in url
      fileName = cmd[2];
      url = cmd[1];
      timeStart = cmd[3];
      timeStop = cmd[4];
    }
    // If the user is only uploading a string
    if (url[0] === '"') {
      let string = cmd.slice(1, cmd.length - 1).join(' ');
      if (string[string.length - 1] !== '"') {
        message.channel.send('Please wrap text in quotation marks.');
        return;
      }
      string = string.slice(1, string.length - 1);
      fileName = cmd[cmd.length - 1];
      if (!fileName) {
        message.channel.send('Please specify a name.');
        return;
      }

      addText(fileName, string, message);
    } else {
      if (!fileName) {
        message.channel.send('Please specify a name.');
        return;
      }

      exten = url.substr((url.lastIndexOf('.') + 1));
      if (!exten) {
        message.channel.send('Could not find file extension');
      }

      add(fileName, url, exten, message, timeStart, timeStop);
    }
  } else if (botCommand === '!post' || botCommand === '!p') {
    // Posting an image
    const fileName = cmd[1];
    if (!fileName) {
      message.channel.send('Please specify a name.');
      return;
    }

    post(fileName, message, bot);
  } else if (botCommand === '!list' || botCommand === '!l') {
    // Listing files
    let fileType, page;
    if (isNaN(cmd[1])) {
      fileType = cmd[1];
      page = cmd[2];
    } else {
      page = cmd[1];
    }
    list({ type: fileType, message, emojis: emojiTriggers, page });
  } else if (botCommand === '!remove' || botCommand === '!r') {
    // Delete any stored reactions
    const fileName = cmd.slice(1, cmd.length).join(' ');
    remove({ fileName, message, emojis: emojiTriggers, cb: () => {
      emojiTriggers = JSON.parse(fs.readFileSync(EMOJI_PATH));
    }});
  } else if (botCommand === '!help' || botCommand === '!h') {
    // Post a help page
    const page = cmd[1];
    help(message, page);
  } else if (botCommand === '!markov') {
    let string = '';
    if (cmd[2] !== undefined && cmd[2] !== null) {
      string = cmd.slice(2, cmd.length).join(' ');
      if (string[string.length - 1] !== '"') {
        message.channel.send('Please wrap text in quotation marks.');
        return;
      }
      string = string.slice(1, string.length - 1);
    }
    if (string == null) {
      string = '';
    }
    if (cmd[1] === 'all') {
      markovUser(null, message.guild, message.channel, string);
      return;
    }
    const channel = message.mentions.channels.first();
    const user = message.mentions.users.first();
    if (user != null) {
      markovUser(user, message.guild, message.channel, string);
      return;
    }
    if (channel != null) {
      markovChannel(channel, message.guild, message.channel, string);
      return;
    }
    message.channel.send('Please specify a User or Channel to markov.');
  } else if (botCommand === '!rename' || botCommand === '!rn') {
    const oldFile = cmd[1];
    const newFile = cmd[2];
    rename(oldFile, newFile, message);
  } else if (botCommand === '!play' || botCommand === '!pl') {
    let media;
    let channel;
    if (cmd.length === 2) {
      channel = cmd[1];
    } else {
      media = cmd[1];
      channel = cmd[2];
    }
    play({channel, media, message, bot});
  } else if (botCommand === '!queue' || botCommand === '!q') {
    queue(message);
  } else if (botCommand === '!skip' || botCommand === '!s') {
    const num = cmd[1];
    skip(num, message);
  } else if (botCommand === '!gpt2') {
    let string = cmd.slice(1).join(' ');
    const channel = message.mentions.channels.first();
    let numOfMessages;
    if (cmd.length > 2) {
      numOfMessages = cmd[2];
    }
    if (numOfMessages > 100) {
      numOfMessages = 100;
    }
    if (channel) {
      promptRelevanceGpt2(message, channel, numOfMessages);
    } else {
      promptGpt2(string, message);
    }
  } else if (botCommand === '!append') {
    const fileName = cmd[1];
    let text = cmd.slice(2, cmd.length).join(' ');
    if (text[0] !== '"' || text[text.length - 1] !== '"') {
      message.channel.send('Please wrap text in quotation marks.');
      return;
    }
    if (!fileName) {
      message.channel.send('Please specify a name.');
      return;
    }
    text = text.slice(1, text.length - 1);
    append({fileName, text, message});
  } else if (botCommand === '!trigger') {
    let text = cmd[3];
    let emoji = cmd[1];
    let chance = cmd[2];
    // If the user is only uploading a string
    if (text[0] === '"') {
      let string = cmd.slice(3, cmd.length).join(' ');
      if (string[string.length - 1] !== '"') {
        message.channel.send('Please wrap text in quotation marks.');
        return;
      }
      text = string.slice(1, string.length - 1);
      if (!emoji) {
        message.channel.send('Please specify an emoji.');
        return;
      } else if (isNaN(chance)) {
        message.channel.send('Please specify an chance.');
        return;
      }
    } else {
      message.channel.send('Please wrap text in quotation marks.');
      return;
    }
    if (!EMOJI_REGEX.test(emoji)) {
      // If it is a custom emoji, parse the id of the string
      emoji = emoji.slice(emoji.lastIndexOf(':') + 1, -1);
    }
    message.react(emoji).then(() => {
      trigger({
        text: text.toLowerCase(),
        reaction: emoji,
        chance,
        message,
        cb: () => { emojiTriggers = JSON.parse(fs.readFileSync(EMOJI_PATH)); },
      });
    }).catch((err) => {
      console.log(err);
      message.channel.send('Could not find emoji');
    });
  }
});

bot.login(TOKEN);
