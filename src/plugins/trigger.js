'use strict';
const { ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
const fs = require('fs');
const { EMOJI_PATH, addJson, EMOJI_REGEX, isDiscordCommand } = require('./util');
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
const trigger = ({text, reaction, chance, cb}) => {
  let json = {
    emoji: reaction,
    chance,
  };
  addJson({ path: EMOJI_PATH, key: text, value: json, cb });
};

const handleDiscordCommand = (interaction, bot) => {
  if (interaction.commandName === 'trigger') {
    let emoji = interaction.options.get('emoji').value;
    const chance = interaction.options.get('percentage').value / 100;
    const text = interaction.options.get('string').value;
    if (isNaN(chance)) {
      interaction.reply(USAGE);
      return;
    }
    if (EMOJI_REGEX.test(emoji)) {
      trigger({
        text: text.toLowerCase(),
        reaction: `${emoji}:`,
        chance,
        message: interaction,
        cb: () => {
          interaction.reply(`Reacting to "${text}" with ${emoji} on a ${parseInt(chance * 100, 10)}% chance`);
          bot.emojiTriggers = JSON.parse(fs.readFileSync(EMOJI_PATH));
        },
      });
    } else {
      const emojiName = emoji.split(':')[1];
      // Only exists for custom emojis
      const emojiId = emoji.split(':')[2].replace('>', '');
      const emojiExistsInBotsServers = !emojiId || bot.emojis.cache.find((emoji) => {
        return emoji.id === emojiId;
      });
      if (!emojiExistsInBotsServers) {
        interaction.reply('Could not find emoji in this server');
        return;
      }
      trigger({
        text: text.toLowerCase(),
        reaction: `${emojiName}:${emojiId}`,
        chance,
        message: interaction,
        cb: () => {
          interaction.reply(`Reacting to "${text}" with ${emoji} on a ${parseInt(chance * 100, 10)}% chance`);
          bot.emojiTriggers = JSON.parse(fs.readFileSync(EMOJI_PATH));
        },
      });
    }
  }
};

const onText = (discordTrigger, bot) => {
  if (isDiscordCommand(discordTrigger)) {
    handleDiscordCommand(discordTrigger, bot);
  }
};

const commandData = [
  {
    name: 'trigger',
    description: 'Sets up an emoji trigger based on a specified string.',
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        name: 'emoji',
        type: ApplicationCommandOptionType.String,
        autocomplete: false,
        description: 'The emoji you want the bot to react with.',
        required: true,
      },
      {
        name: 'percentage',
        type: ApplicationCommandOptionType.Integer,
        autocomplete: false,
        description: 'The percentage chance to trigger a reaction (i.e. 55 for a 55% chance).',
        required: true,
      },
      {
        name: 'string',
        type: ApplicationCommandOptionType.String,
        autocomplete: false,
        description: 'The string you want to trigger a reaction on.',
        required: true,
      },
    ],
  },
];

module.exports = {
  onText,
  commandData,
};
