'use strict';
const {
  makeEmbed,
  DATA_PATH,
  addJson,
  getJson,
  getDiscordId,
} = require('./util');
const USAGE = '`usage: !pat <@person>`';

/**
 * Adds a pat count to the userId
 *
 * @param {String} userId - The Discord user id parsed from a mention
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 */
const pat = (userId, message, bot) => {
  const patJson = {
    date: new Date(),
    patronId: message.author.id,
  };
  addJson({
    path: DATA_PATH,
    key: `patData.${userId}.pats`,
    value: patJson,
    cb: () => {
      getJson({
        path: DATA_PATH,
        key: `patData.${userId}.pats`,
        cb: (pats) => {
          const userDisplay = message.guild.member(userId).displayName;
          message.channel.send(makeEmbed(
            `${userDisplay} has received a head pat!\n` +
            `${userDisplay} now has ${pats.length} ` +
            `head pat${pats.length === 1 ? '' : 's'}.`,
            message.author,
            '',
            `!pat @${userDisplay}`
          ));
        },
      });
    },
  });
};

/**
 * Prints out the number of pats the user who initiated the message receieved
 *
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 */
const printPats = (message, bot) => {
  message.delete();
  getJson({
    path: DATA_PATH,
    key: `patData.${message.author.id}.pats`,
    cb: (pats) => {
      const userDisplay = message.guild.member(message.author.id).displayName;
      message.channel.send(
        makeEmbed(
          `${userDisplay} has been pat ${pats.length} ` +
          ` time${pats.length === 1 ? '' : 's'}!`,
          message.author
        )
      );
    },
  });
};

const onText = (message, bot) => {
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];

  if (botCommand === '!pat') {
    if (cmd.length < 2) {
      message.channel.send(USAGE);
      return;
    } else if (!cmd[1].startsWith('<@')) {
      message.channel.send(USAGE);
    }
    const person = getDiscordId(cmd[1]);
    pat(person, message, bot);
  } else if (botCommand === '!myPats') {
    printPats(message, bot);
  }
};

module.exports = {
  onText,
};
