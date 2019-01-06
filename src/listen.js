'use strict';
const request = require('request');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const stringSimilarity = require('string-similarity');
const {
  makeEmbed,
  findVoiceChannel,
  playChannelJoin,
  playAffirmation,
  RECORD_PATH,
  SOUND_FX_PATH,
  WIT_AI_TOKEN,
} = require('./util');

let currentChannel;

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
              // Get the pcm 32bit signed little endian stereo stream
              const audioStream = receiver.createPCMStream(user);
              const voicePath = `${RECORD_PATH}/${user.id}.wav`;
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
                .on('end', () => {
                  // Once we are done processing, send it to Wit.AI
                  witParse({
                    accessToken: WIT_AI_TOKEN,
                    stream: fs.createReadStream(voicePath),
                    cb: (err, response) => {
                      if (err) console.log(err);
                      console.log(response._text);
                      handleVoice(response._text, connection);
                      if (fs.existsSync(voicePath)) {
                        fs.unlinkSync(voicePath);
                      }
                    },
                  });
                })
                .save(voicePath);
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
    message.channel.send(
      makeEmbed(
        `Leaving: ${currentChannel.name}`,
        message.author)
    );
    currentChannel.leave();
  } else {
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
  voiceText = voiceText.toLowerCase();
  console.log(stringSimilarity.compareTwoStrings(voiceText, 'sandal'));
  if (stringSimilarity.compareTwoStrings(voiceText, 'sandal') > 0.8) {
    playAffirmation(connection);
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
