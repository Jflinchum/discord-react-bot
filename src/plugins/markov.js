'use strict';
const MarkovChain = require('markovchain');
const { makeEmbed, makeEmbedNoUser, setReplayButton } = require('./util');
const USAGE = '`usage: !markov <@user/#textChannel/all> ["messageStart"]`';


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

  guild.channels.cache.each(channel => {
    if (channel.type === 'text') {
      channelLength++;
      channel.messages.fetch({ limit: 100 })
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
    channel.messages.fetch({ limit: 100 })
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

  channel.messages.fetch({ limit: 100, before: message.id })
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
  messages.each((message) => { markovString += (message.content + '\n'); });
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

  const originalPhrase = phrase;
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

  if (user === null) {
    let markovMessage = 'People ' +
    intros[Math.floor(Math.random() * intros.length)] +
    '"*' +
    phrase +
    markovGen.start(getAll).end().process() +
    '*"';
    origChannel.send(
      makeEmbedNoUser(markovMessage, 'Everyone')
    ).then((markovResponse) => {
      setReplayButton(markovResponse, () => {
        postMarkovUser(user, channel, origChannel, originalPhrase);
      });
    });
  } else {
    let markovMessage = user.username +
    intros[Math.floor(Math.random() * intros.length)] +
    '"*' +
    phrase +
    markovGen.start(getAll).end().process() +
    '*"';
    origChannel.send(
      makeEmbed({ message: markovMessage, user })
    ).then((markovResponse) => {
      setReplayButton(markovResponse, () => {
        postMarkovUser(user, channel, origChannel, originalPhrase);
      });
    });
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

  const originalPhrase = phrase;
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
  ).then((markovResponse) => {
    setReplayButton(markovResponse, () => {
      postMarkovChannel(user, channel, origChannel, originalPhrase);
    });
  });
};

const onText = (message) => {
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];

  if (botCommand === '!markov') {
    let string = '';
    if (cmd[2] !== undefined && cmd[2] !== null) {
      string = cmd.slice(2, cmd.length).join(' ');
      if (string[string.length - 1] !== '"') {
        message.channel.send(USAGE);
        return;
      }
      string = string.slice(1, string.length - 1);
    }
    if (string == null) {
      string = '';
    }
    if (cmd[1] === 'all') {
      markovUser(null, message.guild, message.channel, string);
      return;
    }
    const channel = message.mentions.channels.first();
    const user = message.mentions.users.first();
    if (user != null) {
      markovUser(user, message.guild, message.channel, string);
      return;
    }
    if (channel != null) {
      markovChannel(channel, message.guild, message.channel, string);
      return;
    }
    message.channel.send(USAGE);
  }
};

module.exports = {
  markovUser,
  markovChannel,
  onText,
};
