'use strict';

const { Client } = require('discord.js');
const mkdirp = require('mkdirp');
const fs = require('fs');
const cron = require('node-cron');
const {
  PATH,
  DATA_PATH,
  EMOJI_PATH,
  EMOJI_REGEX,
  CRON_PATH,
  removeJson,
  formatEscapedDates,
  config,
  isDirectMessageEnabled,
  formatDateString,
  getJson,
} = require('./plugins/util');
const { onTextHooks } = require('./plugins');
const { createUpdateInterval } = require('./plugins/google/calendar');
const TOKEN = process.env.DISCORD_TOKEN;

const bot = new Client();
// Set up emojis
fs.exists(EMOJI_PATH, (exists) => {
  if (!exists) {
    fs.writeFileSync(EMOJI_PATH, '{}');
  }
  let emojiTriggers = JSON.parse(fs.readFileSync(EMOJI_PATH));
  bot.emojiTriggers = emojiTriggers;
});

// Set up cron jobs
fs.exists(CRON_PATH, (exists) => {
  if (!exists) {
    fs.writeFileSync(CRON_PATH, '{}');
  }
  bot.cronJobs = [];
  let cronJobs = JSON.parse(fs.readFileSync(CRON_PATH));
  const cronKeys = Object.keys(cronJobs);
  for (let i = 0; i < cronKeys.length; i += 1) {
    const key = cronKeys[i];
    const jobs = cronJobs[key];
    for (let j = 0; j < jobs.length; j += 1) {
      const job = jobs[j];
      const newJob = {
        channel: job.channel,
        name: key,
        content: job.content,
        cronTime: job.cronTime,
        guildId: job.guildId,
        messageRef: job.messageRef,
      };
      newJob.cronJob = cron.schedule(job.cronTime, () => {
        const channel = bot.guilds.cache.get(job.guildId)
          .channels.cache.get(job.channel);
        if (channel) {
          if (job.content.startsWith('!')) {
            bot.channels.cache.get(job.messageRef.channelId)
              .messages.fetch(job.messageRef.messageId)
              .then((messageRef) => {
                messageRef.content = job.content;
                messageRef.delete = () => {};
                messageRef.channel = channel;

                onTextHooks.map((onTextFunc) => {
                  onTextFunc(messageRef, bot);
                });
              })
              .catch((err) => {
                console.log('Could not fetch messages: ', err);
              });
          } else {
            channel.send(formatEscapedDates(job.content, new Date()));
          }
        }
      });
      if (bot.cronJobs[newJob.name]) {
        bot.cronJobs[newJob.name].push(newJob);
      } else {
        bot.cronJobs[newJob.name] = [newJob];
      }
    }
  }
});

bot.on('ready', () => {
  console.log('Logged in');
  mkdirp.sync(PATH);
  Object.keys(bot.emojiTriggers).map((triggerWord) => {
    for (let index in bot.emojiTriggers[triggerWord]) {
      // Removing any emojis that are not on the server anymore
      let emojiObj = bot.emojiTriggers[triggerWord][index];
      if (!EMOJI_REGEX.test(emojiObj.emoji) &&
      !bot.guilds.cache.array()[0].emojis.cache.get(emojiObj.emoji)) {
        removeJson({ path: EMOJI_PATH, key: triggerWord });
        delete bot.emojiTriggers[triggerWord];
      }
    }
  });
  if (config.googleAPIEnabled && config.calendar.updateChannelId) {
    createUpdateInterval(bot);
  }
});


bot.on('message', message => {
  // Ignore commands coming from itself to prevent any recurssive nonsense
  if (message.author.id === bot.user.id) {
    return;
  }
  if (!isDirectMessageEnabled(message)) {
    let finalMessage = 'No DMs allowed';
    if (config.dmWhiteList.length > 0) {
      finalMessage = 'The current commands that are available '
      + 'for direct messages are:\n```';
      config.dmWhiteList.map((whiteListedCommand) => {
        finalMessage += `- ${whiteListedCommand}\n`;
      });
      finalMessage += '```';
    }
    message.channel.send(finalMessage);
    return;
  }
  // React with any emojis
  const emojiKeys = Object.keys(bot.emojiTriggers);
  getJson({
    path: DATA_PATH,
    key: 'userConfigs.' + message.author.id,
    cb: (config) => {
      if (config && config.emojiReacts && config.emojiReacts[0] === 'false') {
        return;
      }
      for (let i = 0; i < emojiKeys.length; i++) {
        if (message.content.toLowerCase().includes(emojiKeys[i])) {
          const random = Math.random();
          let emojiArray = bot.emojiTriggers[emojiKeys[i]];
          emojiArray.forEach((emojiChance) => {
            if (emojiChance.chance >= random && !message.deleted) {
              message.react(emojiChance.emoji).catch((err) => {
                console.log('Could not react to message: ', err);
              });
            }
          });
        }
      }
    },
  });
  // Check to make sure the message is a command
  if (message.content[0] !== '!') {
    return;
  }
  console.log(`[${formatDateString(new Date())}] `
    + `${message.author.username} (${message.author.tag})`
    + ` ${message.guild ? message.guild.id : 'DM'}`
    + ' - '
    + message.content);
  try {
    onTextHooks.map((onTextFunc) => {
      onTextFunc(message, bot);
    });
  } catch (err) {
    console.log(err);
    message.channel.send(
      `Ran into unexpected error. Check error log.\n${err.message}`
    );
  }
});

bot.on('error', console.error);

bot.login(TOKEN);
