'use strict';
const MarkovChain = require('markovchain');
const { makeEmbed } = require('./util');

var markovString = '';
var channelLength = 0;
var channelsDone = 0;

var intros = [
  ' says things like this: ',
  ' might say this: ',
  "'s catchphrase is: ",
  ' frequently tells me: ',
  ' likes to say: ',
  ' says: ',
];

const markov = (user, guild, origChannel) => {
  markovString = '';
  channelsDone = 0;
  channelLength = 0;

  guild.channels.tap(channel => {
    if (channel.type === 'text') {
      channelLength++;
      channel.fetchMessages({ limit: 100 })
        .then(messages => {
          asyncMarkov(
            user,
            messages.filter(m => m.author.id === user.id),
            origChannel);
          if (messages.size >= 100) {
            markovRecursive(messages.last(), user, channel, origChannel, 10);
          } else {
            channelsDone++;
            if (channelsDone === channelLength) {
              postMarkov(user, origChannel);
            }
          }
        }).catch(console.error);
    }
  });
};

const markovRecursive = (message, user, channel, origChannel, loop) => {
  if (loop <= 0) {
    channelsDone++;
    if (channelsDone === channelLength) {
      postMarkov(user, origChannel);
    }
    return;
  }

  channel.fetchMessages({ limit: 100, before: message.id })
    .then(messages => {
      asyncMarkov(
        user,
        messages.filter(m => m.author.id === user.id),
        origChannel);
      if (messages.size >= 100) {
        markovRecursive(messages.last(), user, channel,
          origChannel, loop - 1);
      } else {
        channelsDone++;
        if (channelsDone === channelLength) {
          postMarkov(user, origChannel);
        }
      }
    }).catch(console.error);
};

const asyncMarkov = (user, messages, origChannel) => {
  messages.tap((message) => { markovString += (message.content + '\n'); });
};

const postMarkov = (user, origChannel) => {
  channelsDone = 0;
  channelLength = 0;

  var markovGen = new MarkovChain(markovString);

  var getAll = function(wordList) {
    return Object.keys(wordList)[
      ~~(Math.random() * Object.keys(wordList).length)
    ];
  };

  let markovMessage = user.username +
    intros[Math.floor(Math.random() * intros.length)] +
    '"*' +
    markovGen.start(getAll).end().process() +
    '*"';
  origChannel.send(
    makeEmbed(markovMessage, user)
  );
};

module.exports = {
  markov,
};
