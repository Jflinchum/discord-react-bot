'use strict';

const { Client } = require('discord.js');
const mkdirp = require('mkdirp');
const fs = require('fs');
const cron = require('node-cron');
const {
  PATH,
  EMOJI_PATH,
  EMOJI_REGEX,
  CRON_PATH,
  removeJson,
  formatEscapedDates,
} = require('./plugins/util');
const { onTextHooks } = require('./plugins');
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
      };
      newJob.cronJob = cron.schedule(job.cronTime, () => {
        const channel = bot.guilds.get(job.guildId)
          .channels.get(job.channel);
        if (channel)
          channel.send(formatEscapedDates(job.content, new Date()));
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
