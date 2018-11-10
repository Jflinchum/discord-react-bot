'use strict';
const MarkovChain = require('markovchain');
const { makeEmbed, makeEmbedNoUser } = require('./util');

var markovString = '';
var channelLength = 0;
var channelsDone = 0;

var markovCallback = null;

var intros = [
  ' says things like this: ',
  ' might say this: ',
  "'s catchphrase is: ",
  ' frequently tells me: ',
  ' likes to say: ',
  ' says: ',
];

const markovUser = (user, guild, origChannel, phrase) => {
  markovString = '';
  channelsDone = 0;
  channelLength = 0;

  markovCallback = postMarkovUser;

  guild.channels.tap(channel => {
    if (channel.type === 'text') {
      channelLength++;
      channel.fetchMessages({ limit: 100 })
        .then(messages => {
          if (user != null) {
            asyncMarkov(messages.filter(m => m.author.id === user.id));
          } else {
            asyncMarkov(messages);
          }
          if (messages.size >= 100) {
            markovRecursive(messages.last(), user, channel,
              origChannel, phrase, 10);
          } else {
            channelsDone++;
            if (channelsDone === channelLength) {
              markovCallback(user, channel, origChannel, phrase);
            }
          }
        }).catch(console.error);
    }
  });
};

const markovChannel = (channel, guild, origChannel, phrase) => {
  markovString = '';
  channelsDone = 0;
  channelLength = 0;

  markovCallback = postMarkovChannel;

  if (channel.type === 'text') {
    channelLength++;
    channel.fetchMessages({ limit: 100 })
      .then(messages => {
        asyncMarkov(messages);
        if (messages.size >= 100) {
          markovRecursive(messages.last(), null, channel,
            origChannel, phrase, 10);
        } else {
          channelsDone++;
          if (channelsDone === channelLength) {
            markovCallback(null, channel, origChannel, phrase);
          }
        }
      }).catch(console.error);
  }
};

const markovRecursive = (message, user, channel, origChannel, phrase, loop) => {
  if (loop <= 0) {
    channelsDone++;
    if (channelsDone === channelLength) {
      markovCallback(user, channel, origChannel, phrase);
    }
    return;
  }

  channel.fetchMessages({ limit: 100, before: message.id })
    .then(messages => {
      if (user != null) {
        asyncMarkov(messages.filter(m => m.author.id === user.id));
      } else {
        asyncMarkov(messages);
      }
      if (messages.size >= 100) {
        markovRecursive(messages.last(), user, channel,
          origChannel, phrase, loop - 1);
      } else {
        channelsDone++;
        if (channelsDone === channelLength) {
          markovCallback(user, channel, origChannel, phrase);
        }
      }
    }).catch(console.error);
};

const asyncMarkov = (messages) => {
  messages.tap((message) => { markovString += (message.content + '\n'); });
};

const postMarkovUser = (user, channel, origChannel, phrase) => {
  channelsDone = 0;
  channelLength = 0;

  var markovGen = new MarkovChain(markovString);

  var getAll = function(wordList) {
    return Object.keys(wordList)[
      ~~(Math.random() * Object.keys(wordList).length)
    ];
  };

  if (phrase !== null && phrase !== '') {
    console.log(phrase);
    getAll = phrase.split(' ');
    getAll = getAll[getAll.length - 1];
    var lastIndex = phrase.lastIndexOf(' ');
    if (lastIndex !== -1) {
      phrase = phrase.substring(0, lastIndex);
      phrase += ' ';
    } else {
      phrase = '';
    }
  }

  if (user === null) {
    let markovMessage = 'People ' +
    intros[Math.floor(Math.random() * intros.length)] +
    '"*' +
    phrase +
    markovGen.start(getAll).end().process() +
    '*"';
    origChannel.send(
      makeEmbedNoUser(markovMessage, 'Everyone')
    );
  } else {
    let markovMessage = user.username +
    intros[Math.floor(Math.random() * intros.length)] +
    '"*' +
    phrase +
    markovGen.start(getAll).end().process() +
    '*"';
    origChannel.send(
      makeEmbed(markovMessage, user)
    );
  }
};

const postMarkovChannel = (user, channel, origChannel, phrase) => {
  channelsDone = 0;
  channelLength = 0;

  var markovGen = new MarkovChain(markovString);

  var getAll = function(wordList) {
    return Object.keys(wordList)[
      ~~(Math.random() * Object.keys(wordList).length)
    ];
  };

  if (phrase !== null && phrase !== '') {
    getAll = phrase.split(' ');
    getAll = getAll[getAll.length - 1];
    var lastIndex = phrase.lastIndexOf(' ');
    if (lastIndex !== -1) {
      phrase = phrase.substring(0, lastIndex);
      phrase += ' ';
    } else {
      phrase = '';
    }
  }

  let markovMessage = 'People in ' + channel.name +
  ' say things like: ' +
  '"*' +
  phrase +
  markovGen.start(getAll).end().process() +
  '*"';
  origChannel.send(
    makeEmbedNoUser(markovMessage, channel.name)
  );
};

module.exports = {
  markovUser,
  markovChannel,
};
