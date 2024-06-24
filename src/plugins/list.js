'use strict';
const { ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
const fs = require('fs');
const cronstrue = require('cronstrue/i18n');
const { PATH, EMOJI_REGEX, sendTextBlock, isDiscordCommand, getReplyFunction } = require('./util');
const USAGE = '`usage: [!list/!l] [image/music/text/emoji]`';

/**
 * Finds all files using the regex and returns an array of them
 *
 * @param {Func} matchFunc - Matching function use for filter files
 * @param {Array} files - The array of file names to search through
 */
const findFiles = (matchFunc, files) => {
  let response = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // Ignore hidden files
    if (file[0] === '.') {
      continue;
    }
    if (matchFunc(file)) {
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
  let replyFunction = getReplyFunction(message);
  if (message.channel.type !== 'dm' && !isDiscordCommand(message)) {
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
  let otherList = [];

  const imageType = (!type || type === 'image');
  const musicType = (!type || type === 'music');
  const textType = (!type || type === 'text');
  const otherType = (!type || type === 'other')
  const emojiType = (!type || type === 'emoji');
  const cronType = (!type || type === 'cron');

  if (imageType) {
    imageList = findFiles((file) => (imageRegex.test(file)), files);
    if (imageList.length > 0) {
      response += 'Image:\n';
      response += '  ' + imageList.join('  ');
    }
  }
  if (musicType) {
    musicList = findFiles((file) => (musicRegex.test(file)), files);
    if (musicList.length > 0) {
      response += 'Music:\n';
      response += '  ' + musicList.join('  ');
    }
  }
  if (textType) {
    textList = findFiles((file) => (textRegex.test(file)), files);
    if (textList.length > 0) {
      response += 'Text:\n';
      response += '  ' + textList.join('  ');
    }
  }
  if (emojiType) {
    const words = Object.keys(emojis);
    if (words.length > 0) {
      response += 'Emojis:\n';
    }
    for (let index in words) {
      let emojiList = emojis[words[index]];
      response += `  ${words[index]}: `;
      for (let emoji in emojiList) {
        let emojiString = emojiList[emoji].emoji;
        response += `(${emojiString.split(':')[0]}, ${emojiList[emoji].chance}), `;
      }
      response += '\n';
    }
  }
  if (cronType) {
    const jobNames = Object.keys(cronJobs);
    if (jobNames.length > 0) {
      response += 'Cron Jobs: \n';
    }
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
  if (otherType) {
    otherList = findFiles((file) => (!imageRegex.test(file) && !musicRegex.test(file) && !textRegex.test(file)), files);
    if (otherList.length > 0) {
      response += 'Other:\n';
      response += '  ' + otherList.join('  ');
    }
  }

  if (!imageType && !musicType && !textType && !emojiType && !cronType) {
    replyFunction(USAGE);
    return;
  }
  sendTextBlock({ text: response, message, page });
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

const handleDiscordCommand = (interaction, bot) => {
  if (interaction.commandName === 'list') {
    const category = interaction.options.get('category')?.value;
    const page = interaction.options.get('page')?.value;
    list({
      type: category,
      message: interaction,
      emojis: bot.emojiTriggers,
      cronJobs: bot.cronJobs,
      page,
      bot,
    });
  }
};

const onText = (discordTrigger, bot) => {
  if (isDiscordCommand(discordTrigger)) {
    handleDiscordCommand(discordTrigger, bot);
  } else {
    handleDiscordMessage(discordTrigger, bot);
  }
};

const commandData = [
  {
    name: 'list',
    description: 'Displays all stored files.',
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        name: 'category',
        type: ApplicationCommandOptionType.String,
        autocomplete: true,
        description: 'The category of files that you want to list',
        required: false,
        choices: [
          {
            name: 'Images',
            value: 'image'
          },
          {
            name: 'Music/Sound Clips',
            value: 'music'
          },
          {
            name: 'Text Files',
            value: 'text'
          },
          {
            name: 'Emoji Triggers',
            value: 'emoji'
          },
          {
            name: 'Cron Jobs',
            value: 'cron'
          },
          {
            name: 'Other',
            value: 'other'
          },
        ],
      },
      {
        name: 'page',
        type: ApplicationCommandOptionType.String,
        autocomplete: true,
        description: 'The page number for the list',
        required: false,
      },
    ],
  },
];

module.exports = {
  list,
  onText,
  commandData,
};
