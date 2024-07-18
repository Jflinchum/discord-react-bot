'use strict';
const { ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
const BUBBLES_USAGE = '`usage: !bubbles [<width> [<height>]]`';
const POP_TEXT = '||pop||';
const DEFAULT_WIDTH = 5;
const DEFAULT_HEIGHT = 10
const { setReplayButton, isDiscordCommand, getReplyFunction } = require('./util');

const generateBubbleWrap = (width, height, message) => {
  let doReply = getReplyFunction(message);

  if (width < 1) {
    doReply(BUBBLES_USAGE);
    return;
  }
  if (height < 1) {
    doReply(BUBBLES_USAGE);
    return;
  }

  let finalMessage = Array(height).fill(Array(width).fill(POP_TEXT).join('')).join('\n');

  if (finalMessage.length > 2000) {
    doReply('You\'re bubbling too hard! Keep the bubblewrap a bit smaller');
    return;
  }

  doReply(finalMessage).then((bubbleMessage) => {
    if (!bubbleMessage && isDiscordCommand(message)) {
      message.fetchReply().then((bubbleMessage) => {
        setReplayButton(bubbleMessage, (reaction) => {
          const reactionUser = reaction.users.cache.last();
          const memberObject = message.guild.members.cache.get(reactionUser.id);
          message.member = memberObject;
          generateBubbleWrap(width, height, message);
        });
      });
    } else {
      setReplayButton(bubbleMessage, (reaction) => {
        const reactionUser = reaction.users.cache.last();
        const memberObject = message.guild.members.cache.get(reactionUser.id);
        message.member = memberObject;
        generateBubbleWrap(width, height, message);
      });
    }
  }).catch((err) => {
    console.log(err);
  });
};

const handleDiscordCommand = (interaction) => {
  if (interaction.commandName === 'bubbles') {
    const width = interaction.options.get('width')?.value || DEFAULT_WIDTH;
    const height = interaction.options.get('height')?.value || DEFAULT_HEIGHT;
    generateBubbleWrap(parseInt(width, 10), parseInt(height), interaction);
  }
};

const onText = (discordTrigger) => {
  if (isDiscordCommand(discordTrigger)) {
    handleDiscordCommand(discordTrigger);
  }
};

const commandData = [
  {
    name: 'bubbles',
    description: 'Make some bubble wrap',
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        name: 'width',
        type: ApplicationCommandOptionType.Integer,
        autocomplete: true,
        description: 'The width of the sheet of bubble wrap',
        required: false,
      },
      {
        name: 'height',
        type: ApplicationCommandOptionType.Integer,
        autocomplete: true,
        description: 'The height of the sheet of bubble wrap',
        required: false,
      }
    ],
  }
];

module.exports = {
  onText,
  commandData,
};
