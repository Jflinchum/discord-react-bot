'use strict';
const { Client, GatewayIntentBits } = require('discord.js');
const mkdirp = require('mkdirp');
const fs = require('fs');
const emojiNameMap = require('emoji-name-map');
const {
  PATH,
  DATA_PATH,
  EMOJI_PATH,
  EMOJI_REGEX,
  config,
  isDirectMessageEnabled,
  formatDateString,
  getJson,
} = require('./plugins/util');
const { onEvent } = require('./titles');
const { onTextHooks, onUserCommandHooks, commandData } = require('./plugins');
const { setUpCronJobs } = require('./plugins/cron');
const TOKEN = process.env.DISCORD_TOKEN || config.discordToken;

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
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

bot.on('interactionCreate', interaction => {
  try {
    // If the interaction isn't a slash command, return
    if (!interaction.isCommand()) return;

    if (interaction.isChatInputCommand()) {
      onTextHooks.map((onTextFunc) => {
        onTextFunc(interaction, bot);
      });
    } else if (interaction.isUserContextMenuCommand()) {
      onUserCommandHooks.map((onUserCommandFunc) => {
        onUserCommandFunc(interaction, bot);
      });
    }
  } catch (err) {
    console.log(err);
  }
});

bot.on('ready', () => {
  console.log('Logged in');
  mkdirp.sync(PATH);

  bot.application.commands.set(commandData);
});


bot.on('messageCreate', message => {
  try {
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
                  if (emojiChance.emoji.split(':')[1]) {
                    message.react(emojiChance.emoji.split(':')[1]).catch((err) => {
                      console.log('Could not react to message: ', err);
                    });
                  } else if (EMOJI_REGEX.test(emojiChance.emoji.split(':')[0])) {
                    message.react(emojiChance.emoji.split(':')[0]).catch((err) => {
                      console.log('Could not react to message: ', err);
                    });
                  } else {
                    message.react(emojiNameMap.get(emojiChance.emoji.split(':')[0])).catch((err) => {
                      console.log('Could not react to message: ', err);
                    });
                  }
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
  } catch (err) {
    console.log(err);
  }
});

bot.on('messageReactionAdd', (reaction, user) => {
  try {
    onEvent({ event: 'reaction', data: reaction, user, guild: reaction.message.guild, bot });
  } catch (err) {
    console.log(err);
  }
});

bot.on('guildMemberUpdate', (oldMember, newMember) => {
  try {
    onEvent({
      event: 'voiceStateUpdate',
      data: { oldVoiceState, newVoiceState },
      user: newVoiceState.member.user,
      guild: newVoiceState.guild,
      bot,
    });
  } catch (err) {
    console.log(err);
  }
});

bot.on('presenceUpdate', (oldPresence, newPresence) => {
  try {
    onEvent({
      event: 'presenceUpdate',
      data: { oldPresence, newPresence },
      user: newPresence.member.user,
      guild: newPresence.guild,
      bot,
    });
  } catch (err) {
    console.log(err);
  }
});

bot.on('error', console.error);

// bot.on('debug', console.log);

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
