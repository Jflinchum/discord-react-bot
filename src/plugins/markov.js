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

const markovUser = ({ user, guild, origChannel, phrase, message }) => {
  markovString = '';
  channelsDone = 0;
  channelLength = 0;

  markovCallback = postMarkovUser;
  if (!phrase)
    phrase = '';

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

const markovChannel = ({ channel, origChannel, phrase = '', message }) => {
  markovString = '';
  channelsDone = 0;
  channelLength = 0;

  markovCallback = postMarkovChannel;
  if (!phrase)
    phrase = '';

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

  let replyFunction = () => {};
  if (isDiscordCommand(message)) {
    replyFunction = (...args) => message.editReply(...args);
  } else {
    replyFunction = (...args) => origChannel.send(...args);
  }

  if (!user) {
    let markovMessage = 'People ' +
    intros[Math.floor(Math.random() * intros.length)] +
    '"*' +
    phrase +
    markovGen.start(getAll).end().process() +
    '*"';
    replyFunction(
      makeEmbedNoUser({
        message: markovMessage,
        title: 'Everyone',
        footerText: message.cleanContent || '/markov user',
      })
    ).then((markovResponse) => {
      origChannel.stopTyping(true);
      setReplayButton(markovResponse, () => {
        if (isDiscordCommand(message)) {
          message.fetchReply()
            .then((replyMessage) => {
              postMarkovUser(user, channel, origChannel, originalPhrase, replyMessage);
            });
        } else {
          postMarkovUser(user, channel, origChannel, originalPhrase, message);
        }
      });
    });
  } else {
    let markovMessage = user.username +
    intros[Math.floor(Math.random() * intros.length)] +
    '"*' +
    phrase +
    markovGen.start(getAll).end().process() +
    '*"';
    replyFunction(
      makeEmbed({ message: markovMessage, user, footerText: message.cleanContent || `/markov user @${message.guild.members.cache.get(user.id).displayName}` })
    ).then((markovResponse) => {
      origChannel.stopTyping(true);
      setReplayButton(markovResponse, () => {
        if (isDiscordCommand(message)) {
          message.fetchReply().then((replyMessage) => {
            postMarkovUser(user, channel, origChannel, originalPhrase, replyMessage);
          });
        } else {
          postMarkovUser(user, channel, origChannel, originalPhrase, message);
        }
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
  let replyFunction = () => {};
  if (isDiscordCommand(message)) {
    replyFunction = (...args) => message.editReply(...args);
  } else {
    replyFunction = (...args) => origChannel.send(...args);
  }
  replyFunction(
    makeEmbedNoUser({
      message: markovMessage,
      title: channel.name,
      footerText: message.cleanContent || `/markov channel #${channel.name}`,
    })
  ).then((markovResponse) => {
    origChannel.stopTyping(true);
    setReplayButton(markovResponse, () => {
      if (isDiscordCommand(message)) {
        message.fetchReply()
          .then((replyMessage) => {
            postMarkovChannel(user, channel, origChannel, originalPhrase, replyMessage);
          });
      } else {
        postMarkovChannel(user, channel, origChannel, originalPhrase, message);
      }
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
      markovUser({ guild: message.guild, origChannel: message.channel, phrase: string, message });
      message.channel.startTyping();
      return;
    }
    const channel = message.mentions.channels.first();
    const user = message.mentions.users.first();
    if (user != null) {
      markovUser({ user, guild: message.guild, origChannel: message.channel, phrase: string, message });
      message.channel.startTyping();
      return;
    }
    if (channel != null) {
      markovChannel({ channel, guild: message.guild, origChannel: message.channel, phrase: string, message });
      message.channel.startTyping();
      return;
    }
    message.channel.send(USAGE);
  }
};

const handleDiscordCommand = (interaction) => {
  if (interaction.commandName === 'markov') {
    const subCommandName = interaction.options[0]?.name;
    const subCommandOptions = interaction.options[0]?.options;
    if (subCommandName === 'user') {
      const user = subCommandOptions?.[0]?.value;
      const messageStart = subCommandOptions?.[1]?.value;
      const discordGuildMember = interaction.guild.members.cache.get(user);
      interaction.defer();
      interaction.channel.startTyping();
      markovUser({ user: discordGuildMember?.user, guild: interaction.guild, origChannel: interaction.channel, phrase: messageStart, message: interaction });
    } else if (subCommandName === 'channel') {
      const channel = subCommandOptions?.[0]?.value;
      const messageStart = subCommandOptions?.[1]?.value;
      let discordGuildChannel;
      if (channel)
        discordGuildChannel = interaction.guild.channels.cache.get(channel);
      else
        discordGuildChannel = interaction.channel;
      interaction.defer();
      interaction.channel.startTyping();
      markovChannel({ channel: discordGuildChannel, origChannel: interaction.channel, phrase: messageStart, message: interaction });
    }
  }
};

const onText = (discordTrigger) => {
  if (isDiscordCommand(discordTrigger)) {
    handleDiscordCommand(discordTrigger);
  } else {
    handleDiscordMessage(discordTrigger);
  }
};

const commandData = [
  {
    name: 'markov',
    description: 'Generates some text through markov',
    options: [
      {
        name: 'user',
        type: 'SUB_COMMAND',
        description: 'Generates some text based off of a user.',
        options: [
          {
            name: 'user',
            description: 'The user that you want to base the text off of. Defaults to everyone.',
            type: 'USER',
            required: false,
          },
          {
            name: 'message_start',
            type: 'STRING',
            description: 'The start of the text you\'re generating',
            required: false,
          }
        ]
      },
      {
        name: 'channel',
        type: 'SUB_COMMAND',
        description: 'Generates some text based off of a channel.',
        options: [
          {
            name: 'channel',
            description: 'The channel that you want to base the text off of. Defaults to the current channel.',
            type: 'CHANNEL',
            required: false,
          },
          {
            name: 'message_start',
            type: 'STRING',
            description: 'The start of the text you\'re generating',
            required: false,
          }
        ]
      },
    ],
  },
];

module.exports = {
  markovUser,
  markovChannel,
  onText,
  commandData,
};
