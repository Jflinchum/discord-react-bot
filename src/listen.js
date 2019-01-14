'use strict';
const request = require('request');
const ffmpeg = require('fluent-ffmpeg');
const stringSimilarity = require('string-similarity');
const fs = require('fs');
const { PassThrough } = require('stream');
const {
  makeEmbed,
  findVoiceChannel,
  playChannelJoin,
  playAffirmation,
  playNegative,
  strCmp,
  SOUND_FX_PATH,
  WIT_AI_TOKEN,
  PATH,
  WAKE_WORDS,
} = require('./util');
const { playSong } = require('./play');

let currentChannel;
// As soon as it hears the key word, listen for commands
let wakeWord = false;
// Buffer timer is a timeout object.
let bufferTimer = setTimeout(() => {}, 0);
let bufferedCommand = '';
// How long the bot waits for someone to finish speaking
const BUFFER_WAIT_TIME = 3000; // In milliseconds

/**
 * Join in on a channel and parse the meaning of any voices heard.
 *
 * @param voiceChannel {String} - The voice channel to join
 * @param message {Object} - The Discord Message object that
 * initiated the command
 * @param bot {Object} - The Discord Client object that represents the bot
 */
const listen = ({ voiceChannel, message, bot }) => {
  if (!voiceChannel) {
    message.channel.send('Please specify a channel name.');
    return;
  }

  // Find the voice channel to join
  let vc = findVoiceChannel({ channel: voiceChannel, message, bot });
  if (!vc) {
    message.channel.send('Could not find voice channel.');
    return;
  }
  message.channel.send(
    makeEmbed(
      `Joining: ${vc.name}`,
      message.author)
  );
  currentChannel = vc;
  // Join voice channel and parse voices
  vc.join()
    .then((connection) => {
      /*
      The discord js package (v11.4.2) currently seems to have a bug where
      the bot cannot get any user voice streams unless it plays a sound first.
      For this reason, we are not able to do any speech recognition until
      we have a SOUND_FX_PATH created and some CHANNEL_JOIN_FX clips to play.
      */
      if (fs.existsSync(SOUND_FX_PATH)) {
        const dispatch = playChannelJoin(connection);
        dispatch.on('end', () => {
          let receiver = connection.createReceiver();

          connection.on('speaking', (user, speaking) => {
            if (speaking) {
              // If the user speaks while the bot is awake, clear the timeout
              if (wakeWord) {
                clearTimeout(bufferTimer);
              }
              // Get the pcm 32bit signed little endian stereo stream
              const audioStream = receiver.createPCMStream(user);
              const pass = new PassThrough();
              /*
              We must first process the audio stream and convert it from
              stereo to mono. There's probably a better process than saving
              it as a wav file, streaming that to Wit.AI, and then deleting the
              file, however as of right now I do not know the best way to do
              that.
              */
              ffmpeg(audioStream)
                .addInputOptions([
                  '-f s32le',
                  '-ar 48k',
                  '-ac 1',
                ])
                .format('wav')
                .on('end', () => {
                  // Once we are done processing, send it to Wit.AI
                  witParse({
                    accessToken: WIT_AI_TOKEN,
                    stream: pass,
                    cb: (err, response) => {
                      if (err) {
                        console.log(err);
                      }
                      if (!wakeWord) {
                        handleVoice(response._text, connection);
                      } else {
                        bufferedCommand += response._text + ' ';
                      }
                    },
                  });
                })
                .pipe(pass);
            } else if (wakeWord) {
              // If the bot is awake and a user stops speaking, start the timer
              bufferTimer = setTimeout(() => {
                handleVoice(bufferedCommand, connection);
                bufferedCommand = '';
                wakeWord = false;
              }, BUFFER_WAIT_TIME);
            }
          });
        });
      } else {
        message.channel.send('There are no voice clips for the bot.' +
        ' Please contact an administrator.');
        vc.leave();
      }
    })
    .catch((err) => {
      message.channel.send('Could not join channel.');
      console.log(err);
    });
};

/**
 * Leaves the current channel that the bot is listening in on.
 *
 * @param message {Object} - The Discord Message object that
 * initiated the command
 */
const leave = ({ message }) => {
  if (currentChannel) {
    if (message) {
      message.channel.send(
        makeEmbed(
          `Leaving: ${currentChannel.name}`,
          message.author)
      );
    }
    currentChannel.leave();
  } else if (message) {
    message.channel.send('Not currently listening to a channel.');
  }
};

/**
 * Handles the commands of the voice-to-text
 *
 * @param voiceText {String} - The voice-to-text string to parse
 * @param connection {Object} - The Discord VoiceConnection object that the
 * voice was heard from
 */
const handleVoice = (voiceText, connection) => {
  console.log(voiceText);
  if (!voiceText) {
    if (wakeWord) {
      playNegative(connection);
    }
    return;
  }
  let commandRecognized = false;
  voiceText = voiceText.toLowerCase().split(' ');
  let wakeWordRate = stringSimilarity
    .findBestMatch(voiceText[0], WAKE_WORDS)
    .bestMatch
    .rating;
  if (wakeWordRate > 0.8) {
    playAffirmation(connection);
    wakeWord = true;
    // Start the buffer timer to handle the buffered command when a user
    // is done talking
    bufferTimer = setTimeout(() => {
      handleVoice(bufferedCommand, connection);
      bufferedCommand = '';
      wakeWord = false;
    }, BUFFER_WAIT_TIME);
  } else if (wakeWord) {
    if (strCmp(voiceText[0], 'play') > 0.8) {
      commandRecognized = playFile(voiceText, connection);
    } else if (strCmp(voiceText[0], 'post') > 0.8) {
      commandRecognized = true;
      playAffirmation(connection);
    } else if (strCmp(voiceText[0], 'leave') > 0.8) {
      commandRecognized = true;
      playNegative(connection).on('end', () => {
        leave({});
      });
    } else if (!commandRecognized) {
      playNegative(connection);
    }
  }
};

/**
 * Handles the play command for voice text
 *
 * @param voiceText {String} - The voice-to-text string to parse
 * @param connection {Object} - The Discord VoiceConnection object that the
 * voice was heard from
 */
const playFile = (voiceText, connection) => {
  const mediaName = voiceText.slice(1, voiceText.length).join('');

  const files = fs.readdirSync(PATH).filter((file) => {
    const exten = file.substr((file.lastIndexOf('.') + 1));
    // Only look for mp3 or wav files
    return (exten === 'mp3' || exten === 'wav');
  });
  const noExtensions = files.map((file) => {
    // Remove the extension of files
    return file.substr(0, file.lastIndexOf('.'));
  });
  // Find the closest matching file to what was said
  const ratings = stringSimilarity
    .findBestMatch(mediaName, noExtensions);
  const playFileIndex = ratings.bestMatchIndex;
  const playFileRating = ratings.bestMatch.rating;

  // Only play a sound if it is recognized
  if (playFileRating > 0) {
    const filePath = `${PATH}/${files[playFileIndex]}`;
    console.log(stringSimilarity.findBestMatch(mediaName, noExtensions));
    console.log(filePath);
    playSong({
      connection,
      song: {
        channel: currentChannel,
        media: fs.createReadStream(filePath),
        name: noExtensions[playFileIndex],
      },
      leaveAfter: false,
    });
    return true;
  } else {
    return false;
  }
};

/**
 * Returns the meaning extracted from a audio stream
 *
 * @param accessToken {String} - The access token of wit.ai instance
 * @param stream {StreamReadable} - The audio file to stream over WIT.AI
 * @param cb {Func} - Callback function with the error and response
 */
const witParse = ({ accessToken, stream, cb }) => {
  // Request options
  const request_options = {
    url: 'https://api.wit.ai/speech',
    method: 'POST',
    json: true,
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'audio/wav',
    },
  };

  // Pipe the request
  stream.pipe(
    request(request_options, (error, response, body) => {
      if (response && response.statusCode !== 200) {
        error = 'Error: ' + response.statusCode;
      }
      cb(error, body);
    })
  );
};

module.exports = {
  listen,
  leave,
};
