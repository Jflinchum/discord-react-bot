'use strict';
const MarkovChain = require('markovchain');
const { makeEmbed, makeEmbedNoUser, setReplayButton, isDiscordCommand } = require('./util');
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

const markovUser = (user, guild, origChannel, phrase, message) => {
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
              origChannel, phrase, 10, message);
          } else {
            channelsDone++;
            if (channelsDone === channelLength) {
              markovCallback(user, channel, origChannel, phrase, message);
            }
          }
        }).catch(console.error);
    }
  });
};

const markovChannel = (channel, guild, origChannel, phrase, message) => {
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
            origChannel, phrase, 10, message);
        } else {
          channelsDone++;
          if (channelsDone === channelLength) {
            markovCallback(null, channel, origChannel, phrase, message);
          }
        }
      }).catch(console.error);
  }
};

const markovRecursive = (message, user, channel, origChannel, phrase, loop, messageObj) => {
  if (loop <= 0) {
    channelsDone++;
    if (channelsDone === channelLength) {
      markovCallback(user, channel, origChannel, phrase, messageObj);
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
          origChannel, phrase, loop - 1, messageObj);
      } else {
        channelsDone++;
        if (channelsDone === channelLength) {
          markovCallback(user, channel, origChannel, phrase, messageObj);
        }
      }
    }).catch(console.error);
};

const asyncMarkov = (messages) => {
  messages.each((message) => { markovString += (message.content + '\n'); });
};

const postMarkovUser = (user, channel, origChannel, phrase, message) => {
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
      makeEmbedNoUser({
        message: markovMessage,
        title: 'Everyone',
        footerText: message.cleanContent,
      })
    ).then((markovResponse) => {
      origChannel.stopTyping(true);
      setReplayButton(markovResponse, () => {
        postMarkovUser(user, channel, origChannel, originalPhrase, message);
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
      makeEmbed({ message: markovMessage, user, footerText: message.cleanContent })
    ).then((markovResponse) => {
      origChannel.stopTyping(true);
      setReplayButton(markovResponse, () => {
        postMarkovUser(user, channel, origChannel, originalPhrase, message);
      });
    });
  }
};

const postMarkovChannel = (user, channel, origChannel, phrase, message) => {
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
    makeEmbedNoUser({
      message: markovMessage,
      title: channel.name,
      footerText: message.cleanContent,
    })
  ).then((markovResponse) => {
    origChannel.stopTyping(true);
    setReplayButton(markovResponse, () => {
      postMarkovChannel(user, channel, origChannel, originalPhrase, message);
    });
  });
};

const handleDiscordMessage = (message) => {
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
      markovUser(null, message.guild, message.channel, string, message);
      message.channel.startTyping();
      return;
    }
    const channel = message.mentions.channels.first();
    const user = message.mentions.users.first();
    if (user != null) {
      markovUser(user, message.guild, message.channel, string, message);
      message.channel.startTyping();
      return;
    }
    if (channel != null) {
      markovChannel(channel, message.guild, message.channel, string, message);
      message.channel.startTyping();
      return;
    }
    message.channel.send(USAGE);
  }
};

const handleDiscordCommand = () => {

};

const onText = (discordTrigger) => {
  if (isDiscordCommand(discordTrigger)) {
    handleDiscordCommand(discordTrigger);
  } else {
    handleDiscordMessage(discordTrigger);
  }
};

module.exports = {
  markovUser,
  markovChannel,
  onText,
};
