'use strict';
const { ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
const ytdl = require('ytdl-core');
const fs = require('fs');
const validUrl = require('valid-url');
const {
  PATH,
  MAX_YT_TIME,
  download,
  ytdownload,
  makeEmbed,
  hasFile,
  isDiscordCommand,
  getReplyFunction,
} = require('./util');
const USAGE = '`usage: [!add/!a] [<url>/"Example String Here"] <name>' +
  ' [<startTimeStamp>] [<stopTimeStamp>]`';

const downloadAndAdd = ({ fileName, url, exten, stopTime, startTime, loadingMsg, originalMessage }) => {
  let replyFunction = getReplyFunction(originalMessage);
  const author = originalMessage?.author || originalMessage?.user;
  if (!fileName) {
    if (loadingMsg)
      loadingMsg.delete();
    replyFunction(USAGE);
    return;
  }
  // Check for youtube videos
  if (url.includes('www.youtube.com') || url.includes('youtu.be')) {
    ytdl.getBasicInfo(url).then((info) => {
      const duration = (stopTime - startTime) ||
      (info.videoDetails.lengthSeconds - (startTime || 0));
      // Check the length of the video
      if (info.videoDetails.lengthSeconds < MAX_YT_TIME
        || (duration && duration < MAX_YT_TIME)) {
        /**
         * Download the audio from the video as mp3
         *
         * Duration is either stopTime - startTime or
         * the video length - startTime/0
         */
        ytdownload({
          url,
          fileName,
          timeStart: startTime,
          duration,
          cb: () => {
            if (loadingMsg)
              loadingMsg.delete();
            replyFunction(
              makeEmbed({
                message: `Added ${info.videoDetails.title} as ${fileName}`,
                user: author,
                member: originalMessage.guild.members.cache.get(author.id).displayName,
                color: originalMessage.guild.members.cache.get(author.id).displayColor,
              })
            );
          },
        });
      } else {
        if (loadingMsg)
          loadingMsg.delete();
        replyFunction(
          'That video is too long! Keep it at 2:30 or below.'
        );
      }
    }).catch((err) => {
      console.log('Could not get youtube info', err);
      if (loadingMsg)
        loadingMsg.delete();
      replyFunction('Could not get video info.');
      return;
    });
  } else {
    if (!exten) {
      if (loadingMsg)
        loadingMsg.delete();
      replyFunction('Could not find file extension');
    }
    // Download the file
    download({
      url,
      fileName,
      extension: exten,
      timeStart: startTime,
      timeStop: stopTime,
      cb: (err) => {
        if (err) {
          console.log('Could not download file: ', err);
          if (loadingMsg)
            loadingMsg.delete();
          replyFunction(err);
        } else {
          if (loadingMsg)
            loadingMsg.delete();
          replyFunction(
            makeEmbed({
              message: `Added: ${fileName}`,
              user: author,
              member: originalMessage.guild.members.cache.get(author.id).displayName,
              color: originalMessage.guild.members.cache.get(author.id).displayColor,
            })
          );
        }
      },
    });
  }
};

/**
 * Adds a file to the local storage space. If the url is a youtube video,
 * it will download the audio and store it as an mp3. It will only download
 * youtube videos <= 2 minutes and 30 seconds
 *
 * @param {String} fileName - The name to store the file as
 * @param {String} url - The url of the file
 * @param {String} exten - The extension to save the file as
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 * @param {Number|Optional} startTime - The start time to go to for
 * music in seconds
 * @param {Number|Optional} stopTime - The stop time to trim to for
 * music in seconds
 */
const add = async (fileName, url, exten, message, startTime, stopTime) => {
  let replyFunction = getReplyFunction(message);
  if (hasFile({ fileName })) {
    replyFunction('File name already exists.');
    return;
  }
  // Send a loading message that will get deleted later since
  // downloading can take a while
  if (isDiscordCommand(message)) {
    await message.deferReply();
    downloadAndAdd({
      fileName,
      url,
      exten,
      originalMessage: message,
      startTime,
      stopTime,
    });
  } else {
    message.channel.send('Loading...').then(loadingMsg => {
      downloadAndAdd({
        fileName,
        url,
        exten,
        originalMessage: message,
        loadingMsg,
        startTime,
        stopTime,
      });
    });
  }
};

/**
 * Creates a text file in the local storage and writes the text into that file
 *
 * @param {String} fileName - The name to store the file as
 * @param {String} text - The text to store in the file
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 */
const addText = (fileName, text, message) => {
  let replyFunction = getReplyFunction(message);
  const author = message?.author || message?.user;
  if (hasFile({fileName})) {
    replyFunction('File name already exists.');
    return;
  }
  fs.writeFile(`${PATH}/${fileName}.txt`, text, (err) => {
    if (err) {
      replyFunction('Could not write the text to a file');
      return;
    }
    if (!isDiscordCommand(message))
      message.delete();
    replyFunction(
      makeEmbed({
        message: `Added: ${fileName}`,
        user: author,
        member: message.guild.members.cache.get(author.id).displayName,
        color: message.guild.members.cache.get(author.id).displayColor,
      })
    );
  });
};

const handleDiscordCommand = (interaction) => {
  if (interaction.commandName === 'add') {
    const file = interaction.options.get('url_or_text')?.value;
    const attachment = interaction.options.getAttachment('attachment');
    const fileName = interaction.options.get('name')?.value;
    const timeStart = interaction.options.get('time_start')?.value;
    const timeStop = interaction.options.get('time_end')?.value;
    
    if (!file && !attachment) {
      interaction.reply({ content: 'Please specify either a url_or_text or attachment.', ephemeral: true });
      return;
    }
    
    const potentialUri = file || attachment.url;
    if (validUrl.isUri(potentialUri)) {
      const exten = potentialUri.substr((potentialUri.lastIndexOf('.') + 1))?.split('?')?.[0];
      if (
        (!exten || !exten.match(/^[a-z]+$/i)) &&
        !(potentialUri.includes('www.youtube.com') || potentialUri.includes('youtu.be'))
      ) {
        interaction.reply('Could not find file extension');
        return;
      }
      add(fileName, potentialUri, exten, interaction, timeStart, timeStop);
    } else {
      addText(fileName, file, interaction);
    }
  }
};

const onText = (discordTrigger) => {
  if (isDiscordCommand(discordTrigger)) {
    handleDiscordCommand(discordTrigger);
  }
};

const commandData = [
  {
    name: 'add',
    description: 'Stores a file to be used with either the play or post command.',
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        name: 'name',
        type: ApplicationCommandOptionType.String,
        autocomplete: false,
        description: 'The name you want the file to be stored as.',
        required: true,
      },
      {
        name: 'url_or_text',
        type: ApplicationCommandOptionType.String,
        autocomplete: false,
        description: 'The file you want to add. Can either be a url (such as a youtube or image link) or plain text.',
        required: false,
      },
      {
        name: 'attachment',
        type: ApplicationCommandOptionType.Attachment,
        autocomplete: false,
        description: 'The file you want to add.',
        required: 'false',
      },
      {
        name: 'time_start',
        type: ApplicationCommandOptionType.Integer,
        autocomplete: false,
        description: 'If uploading a youtube video, this signifies the start time in seconds.',
        required: false,
      },
      {
        name: 'time_end',
        type: ApplicationCommandOptionType.Integer,
        autocomplete: false,
        description: 'If uploading a youtube video, this signifies the end time in seconds.',
        required: false,
      }
    ],
  }
];

module.exports = {
  add,
  addText,
  onText,
  commandData,
};
