'use strict';
const { Client, Intents } = require('discord.js');
const mkdirp = require('mkdirp');
const fs = require('fs');
const {
  PATH,
  DATA_PATH,
  EMOJI_PATH,
  EMOJI_REGEX,
  removeJson,
  config,
  isDirectMessageEnabled,
  formatDateString,
  getJson,
} = require('./plugins/util');
const { onEvent } = require('./titles');
const { onTextHooks, commandData } = require('./plugins');
const { setUpCronJobs } = require('./plugins/cron');
const { createUpdateInterval } = require('./plugins/google/calendar');
const TOKEN = process.env.DISCORD_TOKEN || config.discordToken;

const bot = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
});

// Set up emojis
fs.exists(EMOJI_PATH, (exists) => {
  if (!exists) {
    fs.writeFileSync(EMOJI_PATH, '{}');
  }
  let emojiTriggers = JSON.parse(fs.readFileSync(EMOJI_PATH));
  bot.emojiTriggers = emojiTriggers;
});

// Set up cron jobs
setUpCronJobs(bot);

bot.on('interaction', interaction => {
  // If the interaction isn't a slash command, return
  if (!interaction.isCommand()) return;

  onTextHooks.map((onTextFunc) => {
    onTextFunc(interaction, bot);
  });
});

bot.on('ready', () => {
  console.log('Logged in');
  mkdirp.sync(PATH);

  bot.application.commands.set(commandData);

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
  onEvent({ event: 'text', data: message, user: message.author, guild: message.guild, bot });
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
          if (emojiArray) {
            emojiArray.forEach((emojiChance) => {
              if (emojiChance.chance >= random && !message.deleted) {
                message.react(emojiChance.emoji).catch((err) => {
                  console.log('Could not react to message: ', err);
                });
              }
            });
          }
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

bot.on('messageReactionAdd', (reaction, user) => {
  onEvent({ event: 'reaction', data: reaction, user, guild: reaction.message.guild, bot });
});

bot.on('guildMemberUpdate', (oldMember, newMember) => {
  onEvent({
    event: 'guildMemberUpdate',
    data: { oldMember, newMember },
    user: newMember.user,
    guild: newMember.guild,
    bot,
  });
});

bot.on('voiceStateUpdate', (oldVoiceState, newVoiceState) => {
  onEvent({
    event: 'voiceStateUpdate',
    data: { oldVoiceState, newVoiceState },
    user: newVoiceState.member.user,
    guild: newVoiceState.guild,
    bot,
  });
});

bot.on('presenceUpdate', (oldPresence, newPresence) => {
  onEvent({
    event: 'presenceUpdate',
    data: { oldPresence, newPresence },
    user: newPresence.member.user,
    guild: newPresence.guild,
    bot,
  });
});

bot.on('error', console.error);

bot.on('debug', console.log);

const cleanUp = () => {
  bot.destroy();
};

process.on('exit', () => {
  console.log('Logging out');
  cleanUp();
});

process.on('SIGINT', () => {
  process.exit();
});

bot.login(TOKEN);
