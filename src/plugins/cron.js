'use strict';
const cron = require('node-cron');
const fs = require('fs');
const {
  CRON_PATH,
  addJson,
  getJson,
  removeJson,
  makeEmbed,
  formatEscapedDates,
  getDiscordId,
  splitArgsWithQuotes,
} = require('./util');
const ADDUSAGE = '`usage: !addCron <name> <#channel> <"message"> <cronSyntax>`';
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


// Set up cron jobs on first time launch
const setUpCronJobs = (bot) => {
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

                  require('./index').onTextHooks.map((onTextFunc) => {
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
};

const addCron = ({
  name,
  channel,
  content,
  cronTime,
  guildId,
  bot,
  message,
}) => {
  if (!cron.validate(cronTime)) {
    message.channel.send('`Invalid cron syntax`');
    return;
  }
  const guild = bot.guilds.cache.get(guildId);
  const messageRef = {
    messageId: message.id,
    channelId: message.channel.id,
  };
  if (guild.channels.cache.get(channel)) {
    getJson({
      path: CRON_PATH,
      key: name,
      cb: (value) => {
        if (value) {
          message.channel.send('Cron name already exists.');
          return;
        } else {
          addJson({
            path: CRON_PATH,
            key: name,
            value: { cronTime, content, channel, guildId, messageRef },
            cb: () => {
              let newJob = {
                channel,
                name,
                content,
                cronTime,
                guildId,
                messageRef,
              };
              const guild = bot.guilds.cache.get(guildId);
              // Schedule the cron job
              newJob.cronJob = cron.schedule(cronTime, () => {
                const channelToPost = guild.channels.cache.get(channel);
                if (channelToPost) {
                  const contentToPost = formatEscapedDates(content, new Date());
                  if (contentToPost.startsWith('!')) {
                    bot.channels
                      .cache
                      .get(messageRef.channelId)
                      .messages.fetch(messageRef.messageId)
                      .then((simulatedMessage) => {
                        simulatedMessage.content = content;
                        simulatedMessage.delete = () => {};
                        simulatedMessage.channel = channelToPost;

                        require('./index').onTextHooks.map((onTextFunc) => {
                          onTextFunc(simulatedMessage, bot);
                        });
                      })
                      .catch((err) => {
                        console.log('Could not fetch messages: ', err);
                      });
                  } else {
                    channelToPost.send(contentToPost);
                  }
                }
              });
              // Start the cron job and append it to the bot
              if (bot.cronJobs[name]) {
                bot.cronJobs[name].push(newJob);
              } else {
                bot.cronJobs[name] = [newJob];
              }
              message.channel.send(
                makeEmbed({
                  message: `Added cron job: ${name}`,
                  user: message.author,
                  color: message.guild.member(message.author.id).displayColor,
                })
              );
            },
          });
        }
      },
    });
  } else {
    message.channel.send('Could not find channel');
  }
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
        makeEmbed({
          message: `Removed cron job: ${name}`,
          user: message.author,
          color: message.guild.member(message.author.id).displayColor,
        })
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
  let content = cmd[3];
  if (content.startsWith('"') && content.endsWith('"')) {
    content = content.slice(1, content.length - 1);
  }
  const cron = cmd.slice(4, cmd.length).join(' ');
  return { name, channel, content, cron };
};

const onText = (message, bot) => {
  const cmd = splitArgsWithQuotes(message.content);
  const botCommand = cmd[0];

  if (botCommand === '!addCron') {
    if (cmd.length < 4) {
      message.channel.send(ADDUSAGE);
      return;
    }
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
  setUpCronJobs,
};
