'use strict';
const request = require('request');
const ffmpeg = require('fluent-ffmpeg');
const stringSimilarity = require('string-similarity');
const fs = require('fs');
const ytdl = require('ytdl-core');

const mkdirp = require('mkdirp');
const {
  makeEmbed,
  findVoiceChannel,
  playChannelJoin,
  playAffirmation,
  playNegative,
  playLeave,
  strCmp,
  SOUND_FX_PATH,
  WIT_AI_TOKEN,
  PATH,
  RECORDING_PATH,
  WAKE_WORDS,
} = require('./util');
const { playSong } = require('./play');

let currentChannel;
// As soon as it hears the key word, listen for commands
let wakeWord = false;
// Buffer timer is a timeout object.
let bufferTimer = setTimeout(() => {}, 0);
// The command buffer that the bot listens to while it is awake
let bufferedCommand = '';
// The user to listen for when the bot wakes up
let bufferedUserID = '';
// Keep track of when users start to talk
let userTalkTimes = {};
// How long the bot waits for someone to finish speaking
const BUFFER_WAIT_TIME = 3000; // In milliseconds
const MAX_WAKE_WORD_TIME = 1500; // In milliseconds
const MIN_WAKE_WORD_TIME = 500; // In milliseconds
const WORD_SIMILARITY_RATING = 0.8; // How strict the word compare should be

/**
 * Wakes the bot up and sets the timer to go back to sleep
 *
 * @param connection {Object} - The Discord VoiceConnection object that the
 * voice was heard from
 * @param user {Object} - The Discord User object that contains the user id
 * who initiated the command
 */
const wakeUp = (connection, user) => {
  wakeWord = true;
  bufferedCommand = '';
  bufferedUserID = user.id;
  // Start the buffer timer to handle the buffered command when the user
  // is done talking
  bufferTimer = setTimeout(() => {
    handleVoice(bufferedCommand, connection, user);
    sleep();
  }, BUFFER_WAIT_TIME);
};

/**
 * Resets the global variables for the bot
 */
const sleep = () => {
  bufferedCommand = '';
  bufferedUserID = '';
  wakeWord = false;
};

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
              userTalkTimes[user.id] = Date.now();
              // If the user speaks while the bot is awake, clear the timeout
              if (wakeWord) {
                clearTimeout(bufferTimer);
              }
              // Get the pcm 32bit signed little endian stereo stream
              const audioStream = receiver.createPCMStream(user);
              mkdirp(RECORDING_PATH);
              const voicePath = `${RECORDING_PATH}/${user.id}.wav`;

              /*
              We must first process the audio stream and convert it from
              stereo to mono.
              */
              ffmpeg(audioStream)
                .addInputOptions([
                  '-f s32le',
                  '-ar 48k',
                  '-ac 1',
                ])
                .on('end', () => {
                  /**
                   * Essentially, when we are waiting for the wake word, we are
                   * going to want to only use the api if the voice clip is
                   * less than the MAX_WAKE_WORD_TIME. This is so we don't
                   * overuse the api, which improves performance.
                   */
                  const clipLength = Date.now() - userTalkTimes[user.id];
                  if (
                    wakeWord
                    || ((clipLength <= MAX_WAKE_WORD_TIME)
                    && (clipLength > MIN_WAKE_WORD_TIME))) {
                    // Once we are done processing, send it to Wit.AI
                    witParse({
                      accessToken: WIT_AI_TOKEN,
                      stream: fs.createReadStream(voicePath),
                      cb: (err, response) => {
                        if (err) {
                          console.log(err);
                        }
                        if (!wakeWord) {
                          handleVoice(response._text, connection, user);
                        } else {
                          // Only buffer the command for the user who
                          // initiated it
                          if (user.id === bufferedUserID) {
                            bufferedCommand += response._text + ' ';
                          }
                        }
                      },
                    });
                  }
                })
                .save(voicePath);
            } else if (wakeWord) {
              // If the bot is awake and a user stops speaking, start the timer
              bufferTimer = setTimeout(() => {
                handleVoice(bufferedCommand.trim(), connection, user);
                sleep();
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
    currentChannel = null;
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
const handleVoice = (voiceText, connection, user) => {
  console.log(voiceText);
  if (!voiceText) {
    if (wakeWord) {
      playNegative(connection);
    }
    return;
  }
  let commandRecognized = false;
  voiceText = voiceText.toLowerCase().split(' ');
  // Check if the voice text is a wake word
  let wakeWordRate = stringSimilarity
    .findBestMatch(voiceText[0], WAKE_WORDS)
    .bestMatch
    .rating;
  if (wakeWordRate > WORD_SIMILARITY_RATING) {
    playAffirmation(connection).on('end', () => {
      wakeUp(connection, user);
    });
  } else if (wakeWord) {
    if (strCmp(voiceText[0], 'play') > WORD_SIMILARITY_RATING) {
      commandRecognized = voicePlay(voiceText, connection);

    } else if (strCmp(voiceText[0], 'leave') > WORD_SIMILARITY_RATING) {
      commandRecognized = true;
      playLeave(connection).on('end', () => {
        leave({});
      });

    } else if (strCmp(voiceText[0], 'stop') > WORD_SIMILARITY_RATING) {
      commandRecognized = true;
      playAffirmation(connection);

    } else if (strCmp(voiceText[0], 'search') > WORD_SIMILARITY_RATING) {
      voiceSearch(voiceText, connection, (err) => {
        if (err) {
          playNegative(connection);
        }
      });

    } else if (!commandRecognized) {
      // If the bot does not recognize the command, play the NEGATIVE_FX
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
const voicePlay = (voiceText, connection) => {
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
 * Searches for the first video on youtube given the voice text
 *
 * @param voiceText {String} - The voice-to-text string to parse
 * @param connection {Object} - The Discord VoiceConnection object that the
 * voice was heard from
 * @param cb {Function} - The callback method for whether there was an error or
 * not
 */
const voiceSearch = (voiceText, connection, cb) => {
  const mediaName = voiceText.slice(1, voiceText.length).join('+');
  request(`https://www.youtube.com/results?search_query=${mediaName}`,
    (err, response, body) => {
      if (err) {
        console.log(err);
        return cb(true);
      }
      // Parse through the html for the href of the first youtube video
      const firstVideoIndex = body.indexOf('yt-lockup-content');
      const firstHrefIndex = body.indexOf('href', firstVideoIndex);
      const href = body.slice(firstHrefIndex + 6,
        body.indexOf('"', firstHrefIndex + 6));
      console.log(href);
      const mediaUrl = `www.youtube.com${href}`;
      // For youtube video streaming
      // Check if the url is valid
      if (!ytdl.validateURL(mediaUrl)) {
        return cb(true);
      }
      const ytStream = ytdl(mediaUrl, { filter: 'audioonly' });
      playSong({
        connection,
        song: {
          channel: currentChannel,
          media: ytStream,
          name: mediaName,
        },
        leaveAfter: false,
      });
      return cb(false);
    });
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
