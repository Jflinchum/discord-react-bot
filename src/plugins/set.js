'use strict';
const {
  makeEmbed,
  DATA_PATH,
  addJson,
  getJson,
  removeJson,
} = require('./util');
const AVAILABLE_PROPERTIES = ['email', 'emojiReacts'];
const USAGE = '`usage: !set <property> <value>\nAvailable config settings are: ' +
  `${AVAILABLE_PROPERTIES.join(' | ')}\``;

/**
 * Sets the property for the user who sent the message
 *
 * @param {String} property - The property to set for the user
 * @param {String} value - The value of the property to set
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 */
const set = (property, value, message) => {
  const userId = message.author.id;
  if (AVAILABLE_PROPERTIES.indexOf(property) === -1) {
    let finalMessage = `${property} is not supported. `
      + ' The list of available properties are:\n```';
    AVAILABLE_PROPERTIES.map((prop) => {
      finalMessage += ` - ${prop}\n`;
    });
    finalMessage += '```';
    message.channel.send(finalMessage);
  } else {
    if (value) {
      addJson({
        path: DATA_PATH,
        key: `userConfigs.${userId}.${property}`,
        value,
        append: false,
        cb: () => {
          message.channel.send(
            makeEmbed({
              message: `Set ${property} to ${value}`,
              user: message.author,
              member: message.guild.member(message.author.id).displayName,
              color: message.guild.member(message.author.id).displayColor,
            })
          );
        },
      });
    } else {
      removeJson({
        path: DATA_PATH,
        key: `userConfigs.${userId}.${property}`,
        cb: () => {
          message.channel.send(
            makeEmbed({
              message: `Removed ${property}`,
              user: message.author,
              member: message.guild.member(message.author.id).displayName,
              color: message.guild.member(message.author.id).displayColor,
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
  getJson({
    path: DATA_PATH,
    key: 'userConfigs.' + message.author.id,
    cb: (config) => {
      if (!config) {
        message.channel.send('No configs found!');
        return;
      } else {
        const properties = Object.keys(config);
        let finalMessage = 'The following configs have been found:\n';
        properties.map((property) => {
          finalMessage += ` - ${property}: ${config[property]}\n`;
        });
        message.channel.send(makeEmbed({
          message: finalMessage,
          user: message.author,
          member: message.guild.member(message.author.id).displayName,
          color: message.guild.member(message.author.id).displayColor,
        }));
      }
    },
  });
};

const onText = (message) => {
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];

  if (botCommand === '!set') {
    if (cmd.length < 2) {
      message.channel.send(USAGE);
      return;
    }
    const property = cmd[1];
    const value = cmd[2];
    set(property, value, message);
  } else if (botCommand === '!config') {
    printConfig(message);
  }
};

module.exports = {
  onText,
};
