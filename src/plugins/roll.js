'use strict';
const ROLL_USAGE = '`usage: !roll <amount> d<sides>`';
const MAX_DICE = 20;
const { setReplayButton, isDiscordCommand, getReplyFunction } = require('./util');

const parseSides = (sides) => {
  if (sides[0] === 'd') {
    return parseInt(sides.slice(1), 10);
  } else {
    return parseInt(sides, 10);
  }
};

const rollDice = (amount, sides) => {
  let array = [];
  for (let i = 0; i < amount; i++) {
    array.push(Math.floor(Math.random() * sides) + 1);
  }
  return array;
};

const roll = (amount, sides, message) => {
  const author = message?.author || message?.user
  let replyFunction = getReplyFunction(message);

  if (isNaN(amount) || amount < 0) {
    replyFunction(ROLL_USAGE);
    return;
  }
  if (amount > MAX_DICE) {
    replyFunction(`Maximum number of dice is ${MAX_DICE}`);
    return;
  }
  if (isNaN(sides) || sides < 0) {
    replyFunction(ROLL_USAGE);
    return;
  }
  const diceArray = rollDice(amount, sides);
  let finalMessage = `\`\`\`${author.username} rolled ${amount}`
    + ` d${sides}${amount > 1 ? '\'s' : ''}:\n`;
  for (let i = 0; i < diceArray.length; i++) {
    finalMessage += `${diceArray[i]}\n`;
  }
  finalMessage += '```';
  replyFunction(finalMessage).then((rollMessage) => {
    if (!rollMessage && isDiscordCommand(message)) {
      message.fetchReply().then((rollMessage) => {
        setReplayButton(rollMessage, (reaction) => {
          const reactionUser = reaction.users.cache.last();
          message.user = reactionUser;
          roll(amount, sides, message);
        });
      });
    } else {
      setReplayButton(rollMessage, (reaction) => {
        const reactionUser = reaction.users.cache.last();
        message.author = reactionUser;
        roll(amount, sides, message);
      });
    }
  });
};

const handleDiscordMessage = (message) => {
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];
  if (botCommand === '!roll') {
    if (cmd.length < 3) {
      message.channel.send(ROLL_USAGE);
      return;
    }
    const amount = cmd[1];
    const sides = cmd[2];
    roll(parseInt(amount, 10), parseSides(sides), message);
  }
};

const handleDiscordCommand = (interaction) => {
  if (interaction.commandName === 'roll') {
    const amount = interaction.options[0].value;
    const sides = interaction.options[1].value;
    roll(parseInt(amount, 10), parseSides(sides), interaction);
  }
};

const onText = (discordTrigger) => {
  if (isDiscordCommand(discordTrigger)) {
    handleDiscordCommand(discordTrigger);
  } else {
    handleDiscordMessage(discordTrigger);
  }
};

const commandData = [
  {
    name: 'roll',
    description: 'Roll some dice',
    options: [
      {
        name: 'amount',
        type: 'INTEGER',
        description: 'The amount of dice you want to roll',
        required: true,
      },
      {
        name: 'sides',
        type: 'INTEGER',
        description: 'The amount of sides on the dice that you\'re rolling',
        required: true,
      }
    ],
  }
];

module.exports = {
  onText,
  commandData,
};
