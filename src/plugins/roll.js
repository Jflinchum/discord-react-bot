'use strict';
const ROLL_USAGE = '`usage: !roll <amount> d<sides>`';
const MAX_DICE = 20;
const { setReplayButton, isDiscordCommand } = require('./util');

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
  if (isNaN(amount) || amount < 0) {
    message.channel.send(ROLL_USAGE);
    return;
  }
  if (amount > MAX_DICE) {
    message.channel.send(`Maximum number of dice is ${MAX_DICE}`);
    return;
  }
  if (isNaN(sides) || sides < 0) {
    message.chanenl.send(ROLL_USAGE);
    return;
  }
  const diceArray = rollDice(amount, sides);
  let finalMessage = `\`\`\`${message.author.username} rolled ${amount}`
    + ` d${sides}${amount > 1 ? '\'s' : ''}:\n`;
  for (let i = 0; i < diceArray.length; i++) {
    finalMessage += `${diceArray[i]}\n`;
  }
  finalMessage += '```';
  message.channel.send(finalMessage).then((rollMessage) => {
    setReplayButton(rollMessage, (reaction) => {
      const reactionUser = reaction.users.cache.last();
      message.author = reactionUser;
      roll(amount, sides, message);
    });
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

const handleDiscordCommand = () => {

};

const onText = (discordTrigger) => {
  if (isDiscordCommand(discordTrigger)) {
    handleDiscordCommand(discordTrigger);
  } else {
    handleDiscordMessage(discordTrigger);
  }
};

module.exports = {
  onText,
};
