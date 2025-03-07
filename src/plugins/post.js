'use strict';
const { ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
const fs = require('fs');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { PATH, COLOR, makeEmbed, isDiscordCommand, getReplyFunction } = require('./util');
const USAGE = '`usage: [!post/!p] <name>`';

/**
 * Posts a file stored in the local storage space.
 * If the file is a text file, the bot will post the contents of the file
 * with text to speech enabled.
 *
 * @param {String} fileName - The local file to post
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 * @param {Object} bot - The Discord Client object that represents the bot
 */
const post = async (fileName, message) => {
  const author = message?.author || message?.user
  let replyFunction = getReplyFunction(message);
  // Posting files
  if (!isDiscordCommand(message)) {
    message.delete();
  }
  const files = fs.readdirSync(PATH);
  if (!fileName) {
    replyFunction(USAGE);
    return;
  }
  let file;
  // Find the file associated with the name
  for (let i = 0; i < files.length; i++) {
    if (files[i].substr(0, files[i].lastIndexOf('.')).toLowerCase() ===
        fileName.toLowerCase()) {
      file = files[i];
      break;
    }
  }
  if (!file) {
    replyFunction(`Could not find ${fileName}.`);
    return;
  }

  const exten = file.substr((file.lastIndexOf('.') + 1));
  // If we're not streaming to a voice channel, post the attachment
  const attach = new AttachmentBuilder(`${PATH}/${file}`);
  if (!attach) {
    replyFunction(`Could not find ${fileName}.`);
    return;
  }
  if (exten === 'txt') {
    await message.deferReply({ ephemeral: true });
    // If the file is a text file, post the contents
    const text = fs.readFileSync(`${PATH}/${file}`).toString();
    /*
      First send the message with text to speech enabled, then delete it and
      Send the embeded message style. This work around is because text to
      speech does not work on embeded messages.
    */
    message.channel.send(text)
      .then(() => {
        replyFunction(
          makeEmbed({
            message: text,
            user: author,
            member: message.guild.members.cache.get(author.id).displayName,
            footerText: message.content || `/post ${fileName}`,
            color: message.guild.members.cache.get(author.id).displayColor,
          }),
          { ephemeral: true }
        );
      });
  } else {
    await message.deferReply();
    let messageEmbed = new EmbedBuilder();
    messageEmbed.setThumbnail(author.displayAvatarURL({ dynamic: true }))
    messageEmbed.setImage(`attachment://${file}`);
    messageEmbed.setColor(message.guild.members.cache.get(author.id).displayColor || COLOR);
    messageEmbed.setAuthor({ name: message.guild.members.cache.get(author.id).displayName });
    messageEmbed.setFooter({ text: `/post ${fileName}` });
    message.editReply({ embed: [messageEmbed], files: [{ attachment: `${PATH}/${file}`, name: file }]});
  }
};

const handleDiscordCommand = async (interaction, bot) => {
  if (interaction.commandName === 'post') {
    const fileName = interaction.options.get('file_name')?.value;
    post(fileName, interaction, bot);
  }
};

const onText = (discordTrigger, bot) => {
  if (isDiscordCommand(discordTrigger)) {
    handleDiscordCommand(discordTrigger, bot);
  }
};

const commandData = [
  {
    name: 'post',
    description: 'Post a file to the current channel',
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        name: 'file_name',
        type: ApplicationCommandOptionType.String,
        autocomplete: true,
        description: 'The name of the file you want to post',
        required: true,
      }
    ],
  }
];

module.exports = {
  post,
  onText,
  commandData,
};
