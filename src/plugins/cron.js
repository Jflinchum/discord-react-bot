'use strict';
const { ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
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
  isDiscordCommand,
  getReplyFunction,
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
  messageId,
}) => {
  const author = message?.author || message?.user;
  let replyFunction = getReplyFunction(message);
  if (!cron.validate(cronTime)) {
    replyFunction('`Invalid cron syntax`');
    return;
  }
  const guild = bot.guilds.cache.get(guildId);
  const messageRef = {
    messageId,
    channelId: message.channel.id,
  };
  if (guild.channels.cache.get(channel)) {
    getJson({
      path: CRON_PATH,
      key: name,
      cb: (value) => {
        if (value) {
          replyFunction('Cron name already exists.');
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
              replyFunction(
                makeEmbed({
                  message: `Added cron job: ${name}`,
                  user: author,
                  member: message.guild.members.cache.get(author.id).displayName,
                  color: message.guild.members.cache.get(author.id).displayColor,
                })
              );
            },
          });
        }
      },
    });
  } else {
    replyFunction('Could not find channel');
  }
};

const removeCron = ({ name, bot, message }) => {
  const author = message?.author || message?.user;
  let replyFunction = getReplyFunction(message);
  removeJson({ path: CRON_PATH, key: name, cb: () => {
    const foundJob = bot.cronJobs[name];
    if (foundJob) {
      for (let i = 0; i < foundJob.length; i += 1) {
        let currJob = foundJob[i];
        currJob.cronJob.destroy();
      }
      delete bot.cronJobs[name];
      if (!isDiscordCommand(message))
        message.delete();
      replyFunction(
        makeEmbed({
          message: `Removed cron job: ${name}`,
          user: author,
          member: message.guild.members.cache.get(author.id).displayName,
          color: message.guild.members.cache.get(author.id).displayColor,
        })
      );
    } else {
      if (!isDiscordCommand(message))
        message.delete();
      replyFunction('Could not find cron job');
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

const handleDiscordMessage = (message, bot) => {
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
      messageId: message.id,
    });
  } else if (botCommand === '!removeCron') {
    // i.e !removeCron [name]
    removeCron({ name: cmd[1], bot, message });
  }
};

const handleDiscordCommand = (interaction, bot) => {
  if (interaction.commandName === 'cron') {
    const subCommandName = interaction.options[0]?.name;
    const subCommandOptions = interaction.options[0]?.options;
    if (subCommandName === 'add') {
      const name = subCommandOptions[0]?.value;
      const channel = subCommandOptions[1]?.value;
      const content = subCommandOptions[2]?.value;
      const cronTime = subCommandOptions[3]?.value;
      interaction.defer();
      interaction.fetchReply().then((replyMessage) => {
        addCron({
          name,
          channel,
          content,
          cronTime,
          guildId: interaction.guild.id,
          bot,
          message: interaction,
          messageId: replyMessage.id,
        });
      });
    } else if (subCommandName === 'remove') {
      const name = subCommandOptions[0]?.value;
      removeCron({ name, bot, message: interaction });
    }
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
    name: 'cron',
    description: 'Manages cron jobs run by the bot.',
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        name: 'add',
        type: ApplicationCommandOptionType.Subcommand,
        description: 'Adds a cron job and runs it based on the time specified.',
        options: [
          {
            name: 'name',
            description: 'The name of the cron job for reference.',
            type: ApplicationCommandOptionType.String,
            autocomplete: true,
            required: true,
          },
          {
            name: 'channel',
            type: ApplicationCommandOptionType.Channel,
            description: 'The channel to post to for the cron job.',
            required: true,
          },
          {
            name: 'message',
            type: ApplicationCommandOptionType.String,
            autocomplete: true,
            description: 'The message you want the cron job to post.',
            required: true,
          },
          {
            name: 'cron_syntax',
            type: ApplicationCommandOptionType.String,
            autocomplete: true,
            description: 'Space separated cron syntax (i.e. 0 5 * * 2).',
            required: true,
          },
        ]
      },
      {
        name: 'remove',
        type: ApplicationCommandOptionType.Subcommand,
        description: 'Deletes a cron job.',
        options: [
          {
            name: 'name',
            description: 'The name of the cron that you want to remove.',
            type: ApplicationCommandOptionType.String,
            autocomplete: true,
            required: true,
          },
        ]
      },
    ],
  },
];

module.exports = {
  onText,
  setUpCronJobs,
  commandData,
};
