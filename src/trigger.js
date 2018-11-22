'use strict';
const { EMOJI_PATH, addJson } = require('./util');

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

module.exports = {
  trigger,
};
