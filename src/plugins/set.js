'use strict';
const { makeEmbed, DATA_PATH, addJson, getJson } = require('./util');
const USAGE = '`usage: !set <property> <value>`';
const AVAILABLE_PROPERTIES = ['email'];

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
    addJson({
      path: DATA_PATH,
      key: `userConfigs.${userId}.${property}`,
      value,
      append: false,
      cb: () => {
        message.channel.send(
          makeEmbed(`Set ${property} to ${value}`, message.author)
        );
      },
    });
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
          finalMessage += ` - ${property}: ${config[property]}`;
        });
        message.channel.send(makeEmbed(finalMessage, message.author));
      }
    },
  });
};

const onText = (message) => {
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];
  console.log(botCommand);

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
