'use strict';
const cron = require('node-cron');
const {
  CRON_PATH,
  addJson,
  removeJson,
  makeEmbed,
  formatEscapedDates,
  getDiscordId,
} = require('./util');
// Cron Time Params
// # ┌────────────── second (optional)
// # │ ┌──────────── minute
// # │ │ ┌────────── hour
// # │ │ │ ┌──────── day of month
// # │ │ │ │ ┌────── month
// # │ │ │ │ │ ┌──── day of week
// # │ │ │ │ │ │
// # │ │ │ │ │ │
// # * * * * * *

const addCron = ({
  name,
  channel,
  content,
  cronTime,
  guildId,
  bot,
  message,
}) => {
  addJson({
    path: CRON_PATH,
    key: name,
    value: { cronTime, content, channel, guildId },
    cb: () => {
      let newJob = {
        channel,
        name,
        content,
        cronTime,
        guildId,
      };
      const guild = bot.guilds.find('id', guildId);
      newJob.cronJob = cron.schedule(cronTime, () => {
        const channel = guild.channels.get(channel);
        if (channel)
          channel.send(formatEscapedDates(content, new Date()));
      });
      // Start the cron job and append it to the bot
      if (bot.cronJobs[name]) {
        bot.cronJobs[name].push(newJob);
      } else {
        bot.cronJobs[name] = [newJob];
      }
      message.channel.send(
        makeEmbed(`Added cron job: ${name}`, message.author)
      );
    },
  });
};

const removeCron = ({ name, bot, message }) => {
  removeJson({ path: CRON_PATH, key: name, cb: () => {
    const foundJob = bot.cronJobs[name];
    if (foundJob) {
      for (let i = 0; i < foundJob.length; i += 1) {
        let currJob = foundJob[i];
        currJob.cronJob.destroy();
      }
      delete bot.cronJobs[name];
      message.delete();
      message.channel.send(
        makeEmbed(`Removed cron job: ${name}`, message.author)
      );
    } else {
      message.delete();
      message.channel.send('Could not find cron job');
    }
  }});
};

const formatCmd = (cmd) => {
  const name = cmd[1];
  const channel = getDiscordId(cmd[2]);
  const content = cmd[3];
  const cron = cmd.slice(4, cmd.length).join(' ');
  return { name, channel, content, cron };
};

const onText = (message, bot) => {
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];

  if (botCommand === '!addCron') {
    // i.e !addCron [name] [channel] [link/"message here"] [cron time]
    const cronArgs = formatCmd(cmd);
    addCron({
      name: cronArgs.name,
      channel: cronArgs.channel,
      content: cronArgs.content,
      cronTime: cronArgs.cron,
      guildId: message.guild.id,
      bot,
      message,
    });
  } else if (botCommand === '!removeCron') {
    // i.e !removeCron [name]
    removeCron({ name: cmd[1], bot, message });
  }
};

module.exports = {
  onText,
};
