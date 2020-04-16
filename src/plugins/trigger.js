'use strict';
const fs = require('fs');
const { EMOJI_PATH, addJson, EMOJI_REGEX } = require('./util');
const USAGE = '`usage: !trigger <emoji> <decimalChance> <"Example Text">`';

/**
 * Adds a message/emoji pair to the emoji.json file.
 *
 * @param {String} text - The text to act as a key
 * @param {String} reaction - The emoji reaction to save
 * @param {Float} chance -  The chance to react to the text
 * @param {Object} message - The message that triggered this function
 * @param {Function} cb - Callback function
 */
const trigger = ({text, reaction, chance, message, cb}) => {
  let json = {
    emoji: reaction,
    chance,
  };
  addJson({ path: EMOJI_PATH, key: text, value: json, cb });
};

const onText = (message, bot) => {
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];

  if (botCommand === '!trigger') {
    let text = cmd[3];
    let emoji = cmd[1];
    let chance = cmd[2];
    if (!text || !emoji || !chance) {
      message.channel.send(USAGE);
      return;
    }
    // If the user is only uploading a string
    if (text[0] === '"') {
      let string = cmd.slice(3, cmd.length).join(' ');
      if (string[string.length - 1] !== '"') {
        message.channel.send(USAGE);
        return;
      }
      text = string.slice(1, string.length - 1);
      if (!emoji) {
        message.channel.send(USAGE);
        return;
      } else if (isNaN(chance)) {
        message.channel.send(USAGE);
        return;
      }
    } else {
      message.channel.send(USAGE);
      return;
    }
    if (!EMOJI_REGEX.test(emoji)) {
      // If it is a custom emoji, parse the id of the string
      emoji = emoji.slice(emoji.lastIndexOf(':') + 1, -1);
    }
    message.react(emoji).then(() => {
      trigger({
        text: text.toLowerCase(),
        reaction: emoji,
        chance,
        message,
        cb: () => {
          bot.emojiTriggers = JSON.parse(fs.readFileSync(EMOJI_PATH));
        },
      });
    }).catch((err) => {
      console.log('Could not react with emoji: ', err);
      message.channel.send('Could not find emoji');
    });
  }
};

module.exports = {
  onText,
};
