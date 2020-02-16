'use strict';
const cron = require('node-cron');
const {
  CRON_PATH,
  addJson,
  removeJson,
  makeEmbed,
  formatEscapedDates,
  getDiscordId,
  splitArgsWithQuotes,
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
  const guild = bot.guilds.get(guildId);
  const messageRef = {
    messageId: message.id,
    channelId: message.channel.id,
  };
  if (guild.channels.get(channel)) {
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
        const guild = bot.guilds.get(guildId);
        // Schedule the cron job
        newJob.cronJob = cron.schedule(cronTime, () => {
          const channelToPost = guild.channels.get(channel);
          if (channelToPost) {
            const contentToPost = formatEscapedDates(content, new Date());
            if (contentToPost.startsWith('!')) {
              bot.channels
                .get(messageRef.channelId).fetchMessage(messageRef.messageId)
                .then((simulatedMessage) => {
                  simulatedMessage.content = content;
                  simulatedMessage.delete = () => {};
                  simulatedMessage.channel = channelToPost;

                  require('./index').onTextHooks.map((onTextFunc) => {
                    onTextFunc(simulatedMessage, bot);
                  });
                })
                .catch((err) => {
                  console.log(err);
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
          makeEmbed(`Added cron job: ${name}`, message.author)
        );
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
