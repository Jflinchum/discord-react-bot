'use strict';
const { ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
const {
  makeEmbed,
  DATA_PATH,
  addJson,
  getJson,
  removeJson,
  isDiscordCommand,
  getReplyFunction,
} = require('./util');
const AVAILABLE_PROPERTIES = ['email', 'emojiReacts'];
const USAGE = '`usage: !set <property> <value>\nAvailable config settings are: ' +
  `${AVAILABLE_PROPERTIES.join(' | ')}\``;

const camelToSentenceCase = (text) => {
  let result = text.replace(/([A-Z])/g, " $1");
  let finalResult = result.charAt(0).toUpperCase() + result.slice(1);
  return finalResult;
}

/**
 * Sets the property for the user who sent the message
 *
 * @param {String} property - The property to set for the user
 * @param {String} value - The value of the property to set
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 */
const set = (property, value, message) => {
  const author = message?.author || message?.user
  let replyFunction = getReplyFunction(message);
  const userId = author.id;
  if (AVAILABLE_PROPERTIES.indexOf(property) === -1) {
    let finalMessage = `${property} is not supported. `
      + ' The list of available properties are:\n```';
    AVAILABLE_PROPERTIES.map((prop) => {
      finalMessage += ` - ${prop}\n`;
    });
    finalMessage += '```';
    replyFunction(finalMessage);
  } else {
    if (value) {
      addJson({
        path: DATA_PATH,
        key: `userConfigs.${userId}.${property}`,
        value,
        append: false,
        cb: () => {
          replyFunction(
            makeEmbed({
              message: `Set ${property} to ${value}`,
              user: author,
              member: message.guild.members.cache.get(author.id).displayName,
              color: message.guild.members.cache.get(author.id).displayColor,
            })
          );
        },
      });
    } else {
      removeJson({
        path: DATA_PATH,
        key: `userConfigs.${userId}.${property}`,
        cb: () => {
          replyFunction(
            makeEmbed({
              message: `Removed ${property}`,
              user: author,
              member: message.guild.members.cache.get(author.id).displayName,
              color: message.guild.members.cache.get(author.id).displayColor,
            })
          );
        },
      });
    }
  }
};

/**
 * Responds with the set configs in the data file
 *
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 */
const printConfig = (message) => {
  const author = message?.author || message?.user
  let replyFunction = getReplyFunction(message);
  getJson({
    path: DATA_PATH,
    key: 'userConfigs.' + author.id,
    cb: (config) => {
      if (!config) {
        replyFunction('No configs found!');
        return;
      } else {
        const properties = Object.keys(config);
        let finalMessage = 'The following configs have been found:\n';
        properties.map((property) => {
          finalMessage += ` - ${property}: ${config[property]}\n`;
        });
        replyFunction(makeEmbed({
          message: finalMessage,
          user: author,
          member: message.guild.members.cache.get(author.id).displayName,
          color: message.guild.members.cache.get(author.id).displayColor,
        }));
      }
    },
  });
};

const handleDiscordCommand = (interaction) => {
  if (interaction.commandName === 'config') {
    const subCommandName = interaction.options[0]?.name;
    const subCommandOptions = interaction.options[0]?.options;
    if (subCommandName === 'set') {
      const key = subCommandOptions[0].value;
      const value = subCommandOptions[1].value;
      set(key, value, interaction);
    } else if (subCommandName === 'remove') {
      const key = subCommandOptions[0].value;
      set(key, undefined, interaction);
    } else if (subCommandName === 'print') {
      printConfig(interaction);
    }
  }
};

const onText = (discordTrigger) => {
  if (isDiscordCommand(discordTrigger)) {
    handleDiscordCommand(discordTrigger);
  }
};

const commandData = [
  {
    name: 'config',
    description: 'Manages personalized config options for yourself.',
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        name: 'print',
        type: ApplicationCommandOptionType.Subcommand,
        description: 'Displays all personalized configs that you\'ve set.',
      },
      {
        name: 'set',
        description: 'Sets a config for yourself under a key-value pair.',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'key',
            type: ApplicationCommandOptionType.String,
            autocomplete: true,
            description: 'The key of the config you want to set.',
            required: true,
            choices: AVAILABLE_PROPERTIES.map((prop) => ({ name: camelToSentenceCase(prop), value: prop }))
          },
          {
            name: 'value',
            type: ApplicationCommandOptionType.String,
            autocomplete: true,
            description: 'The value of the config you want to set.',
            required: true,
          },
        ],
      },
      {
        name: 'remove',
        description: 'Removes a config for yourself.',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: 'key',
            type: ApplicationCommandOptionType.String,
            autocomplete: true,
            description: 'The key of the config you want to remove.',
            required: true,
            choices: AVAILABLE_PROPERTIES.map((prop) => ({ name: camelToSentenceCase(prop), value: prop }))
          }
        ],
      }
    ]
  }
];

module.exports = {
  onText,
  commandData
};
