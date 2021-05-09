'use strict';
const fs = require('fs');
const cronstrue = require('cronstrue/i18n');
const { PATH, EMOJI_REGEX, sendTextBlock, isDiscordCommand } = require('./util');
const USAGE = '`usage: [!list/!l] [image/music/text/emoji]`';

/**
 * Finds all files using the regex and returns an array of them
 *
 * @param {String} regex - Regex to use for matching files
 * @param {Array} files - The array of file names to search through
 */
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

/**
 * Finds all files under the given file type and sends a list of them.
 * If no type is specified, list all files under each category.
 * The current categories are Image, Music, Text, Emoji, and Cron
 *
 * @param {String} type - The local file to post
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 * @param {Object} emojis - The emojis to search through and list
 * @param {Object} cronJobs - The list of cron jobs to parse
 * @param {String} page - The page of the list to show
 * @param {Object} bot - The discord bot
 */
const list = ({ type, message, emojis, cronJobs, page, bot }) => {
  if (message.channel.type !== 'dm') {
    message.delete();
  }
  const files = fs.readdirSync(PATH);
  let response = '';
  const imageRegex = (/\.(gif|jpg|jpeg|tiff|png|mp4)$/i);
  const musicRegex = (/\.(mp3|wav)$/i);
  const textRegex = (/\.(txt|pdf)$/i);

  let imageList = [];
  let musicList = [];
  let textList = [];

  const imageType = (!type || type === 'image');
  const musicType = (!type || type === 'music');
  const textType = (!type || type === 'text');
  const emojiType = (!type || type === 'emoji');
  const cronType = (!type || type === 'cron');

  if (imageType) {
    imageList = findFiles(imageRegex, files);
    if (imageList.length > 0) {
      response += 'Image:\n';
      response += '  ' + imageList.join('  ');
    }
  }
  if (musicType) {
    musicList = findFiles(musicRegex, files);
    if (musicList.length > 0) {
      response += 'Music:\n';
      response += '  ' + musicList.join('  ');
    }
  }
  if (textType) {
    textList = findFiles(textRegex, files);
    if (textList.length > 0) {
      response += 'Text:\n';
      response += '  ' + textList.join('  ');
    }
  }
  if (emojiType) {
    response += 'Emojis:\n';
    const words = Object.keys(emojis);
    for (let index in words) {
      let emojiList = emojis[words[index]];
      response += `  ${words[index]}: `;
      for (let emoji in emojiList) {
        let emojiString = emojiList[emoji].emoji;
        if (EMOJI_REGEX.test(emojiString)) {
          // Check to make sure it is not a custom emoji
          response +=
          `(${emojiString},`
          + ` ${emojiList[emoji].chance}), `;
        } else {
          if (message.guild && message.guild.emojis.cache.get(emojiString)) {
            response +=
            `(:${message.guild.emojis.cache.get(emojiString).name}:,`
            + ` ${emojiList[emoji].chance}), `;
          } else if (!message.guild) {
            response +=
            `(:${emojiString}:,`
            + ` ${emojiList[emoji].chance}), `;
          }
        }
      }
      response += '\n';
    }
  }
  if (cronType) {
    response += 'Cron Jobs: \n';
    const jobNames = Object.keys(cronJobs);
    for (let index in jobNames) {
      let jobList = cronJobs[jobNames[index]];
      response += `  ${jobNames[index]}:`;
      for (let job in jobList) {
        const guild = bot.guilds.cache.get(jobList[job].guildId);
        response += `  (${jobList[job].content}, `
          + `${guild.channels.cache.get(jobList[job].channel).name}, `
          + `${cronstrue.toString(jobList[job].cronTime)}),`;
      }
      response += '\n';
    }
  }

  if (!imageType && !musicType && !textType && !emojiType && !cronType) {
    message.channel.send(USAGE);
    return;
  }
  sendTextBlock({text: response, message, page});
};

const handleDiscordMessage = (message, bot) => {
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];

  if (botCommand === '!list' || botCommand === '!l') {
    // Listing files
    let fileType, page;
    if (isNaN(cmd[1])) {
      fileType = cmd[1];
      page = cmd[2];
    } else {
      page = cmd[1];
    }
    list({
      type: fileType,
      message,
      emojis: bot.emojiTriggers,
      cronJobs: bot.cronJobs,
      page,
      bot,
    });
  }
};

const handleDiscordCommand = () => {

};

const onText = (discordTrigger, bot) => {
  if (isDiscordCommand(discordTrigger)) {
    handleDiscordCommand(discordTrigger);
  } else {
    handleDiscordMessage(discordTrigger, bot);
  }
};

module.exports = {
  list,
  onText,
};
