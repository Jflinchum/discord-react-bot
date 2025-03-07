'use strict';
const { ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
const {
  makeEmbed,
  DATA_PATH,
  addJson,
  getJson,
  getDiscordId,
  setReplayButton,
  isDiscordCommand,
  getReplyFunction,
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
  const author = message?.author || message?.user;
  const patJson = {
    date: new Date(),
    patronId: author.id,
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
          let replyFunction = getReplyFunction(message);
          const userObject = message.guild.members.cache.get(userId);
          replyFunction(makeEmbed({
            message: `${userObject.displayName} has received a head pat!\n` +
            `${userObject.displayName} now has ${pats.length} ` +
            `head pat${pats.length === 1 ? '' : 's'}.`,
            user: userObject.user,
            member: message.guild.members.cache.get(userObject.user.id).displayName,
            title: message.guild.members.cache.get(author.id).displayName,
            footerText: `/pat @${userObject.displayName}`,
            color: userObject.displayColor,
            authorIcon: author.displayAvatarURL(),
          })).then((patMessage) => {
            if (!patMessage && isDiscordCommand(message)) {
              message.fetchReply().then((patMessage) => {
                setReplayButton(patMessage, (reaction) => {
                  const reactionUser = reaction.users.cache.last();
                  message.user = reactionUser;
                  pat(userId, message, bot);
                });
              });
            } else {
              setReplayButton(patMessage, (reaction, user) => {
                const reactionUser = user;
                message.author = reactionUser;
                pat(userId, message, bot);
              });
            }
          });
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
const printPats = (message) => {
  if (!isDiscordCommand(message)) {
    message.delete();
  }
  const author = message?.author || message?.user
  let replyFunction = getReplyFunction(message);
  getJson({
    path: DATA_PATH,
    key: `patData.${author.id}.pats`,
    cb: (pats) => {
      const userDisplay = message.guild.members.cache.get(author.id).displayName;
      replyFunction(
        makeEmbed({
          message: `${userDisplay} has been pat ${pats.length} ` +
          ` time${pats.length === 1 ? '' : 's'}!`,
          user: author,
          member: message.guild.members.cache.get(author.id).displayName,
          color: message.guild.members.cache.get(author.id).displayColor,
        })
      );
    },
  });
};

const handleDiscordCommand = (interaction, bot) => {
  if (interaction.commandName === 'pat') {
    const person = interaction.options.get('user').value;
    pat(person, interaction, bot);
  } else if (interaction.commandName === 'my_pats') {
    printPats(interaction, bot);
  }
};

const onText = (discordTrigger, bot) => {
  if (isDiscordCommand(discordTrigger)) {
    handleDiscordCommand(discordTrigger, bot);
  }
};

const onUserCommand = (interaction, bot) => {
  if (interaction.commandName === 'pat') {
    const person = interaction.targetUser.id;
    pat(person, interaction, bot);
  }
};

const commandData = [
  {
    name: 'pat',
    description: 'Gives another member a pat!',
    type: ApplicationCommandType.ChatInput,
    options: [{
      name: 'user',
      type: ApplicationCommandOptionType.User,
      description: 'The member you want to pat',
      required: true,
    }],
  },
  {
    name: 'my_pats',
    description: 'Check how many pats you have received',
  },
  {
    name: 'Pat',
    type: ApplicationCommandType.User,
  }
];

module.exports = {
  onText,
  onUserCommand,
  commandData,
};
