'use strict';
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { MessageEmbed } = require('discord.js');
const {
  COLOR,
  COLOR_FORMATTED,
  getJson,
  DATA_PATH,
  splitArgsWithQuotes,
  isDiscordCommand,
  getReplyFunction,
} = require('./util');
const achievements = require('./../../achievements') || {};
const { getRarityColor } = require('./../titles');
const USAGE = `\`\`\`
usage: !chart
  - pats
  - patrons [@user]
  - achievements "achievementName"
  - rarities [@user]
\`\`\``;

const width = 400; // px
const height = 400; // px
const fontColor = 'white';
const fontFamily = 'cambria';
const chartCallback = (ChartJS) => {
  ChartJS.defaults.global.defaultFontColor = fontColor;
  ChartJS.defaults.global.defaultFontFamily = fontFamily;
};
const canvasRenderService = new ChartJSNodeCanvas({ width, height, chartCallback });

const mapMemberNamesToData = ({ userIds, dataset, valueFunc, guild, cb }) => {
  let promiseArray = [];
  for (let i = 0; i < userIds.length; i++) {
    promiseArray.push(new Promise((resolve) => {
      const userId = userIds[i];
      guild.members.fetch(userId).then((member) => {
        if (member) {
          return resolve({
            key: member.displayName,
            value: valueFunc(dataset, userId),
            color: member.displayHexColor !== '#000000' ?
              member.displayHexColor : COLOR_FORMATTED,
          });
        } else {
          return resolve();
        }
      }).catch((err) => {
        console.log(err);
        return resolve();
      });
    }));
  }
  Promise.all(promiseArray)
    .then((promiseAll) => {
      return cb(promiseAll);
    }).catch((err) => {
      console.log(err);
    });
};

const getPatData = (guild, cb) => {
  getJson({
    path: DATA_PATH,
    key: 'patData',
    cb: (patData) => {
      // Patdata is an object with userIds mapped to pats
      const userIds = Object.keys(patData);
      // Sort user ids from largest to smallest
      userIds.sort((userA, userB) => patData[userB].pats.length - patData[userA].pats.length);
      const topFive = userIds.slice(0, 5);
      return mapMemberNamesToData({
        userIds: topFive,
        dataset: patData,
        valueFunc: (dataset, userId) => dataset[userId].pats.length,
        guild,
        cb,
      });
    },
  });
};

const getAchievementData = ({ guild, achievement, cb = () => {} }) => {
  getJson({
    path: DATA_PATH,
    key: 'achievementData',
    cb: (achievementData) => {
      // AchievementData is an object with userIds mapped to achievements gained
      const userIds = Object.keys(achievementData);
      const achievementLookup = Object.keys(achievements)
        .filter(achievementName => achievementName.toLowerCase() === achievement.toLowerCase());
      const achievementLookupName = achievementLookup ? achievementLookup[0] : achievement;
      userIds.sort((userA, userB) => {
        const userBAchievementProgress = achievementData[userB][achievementLookupName] ?
          achievementData[userB][achievementLookupName].progress[0] : 0;
        const userAAchievementProgress = achievementData[userA][achievementLookupName] ?
          achievementData[userA][achievementLookupName].progress[0] : 0;
        return userBAchievementProgress - userAAchievementProgress;
      });
      const topFive = userIds.slice(0, 5);
      return mapMemberNamesToData({
        userIds: topFive,
        dataset: achievementData,
        valueFunc: (dataset, userId) => dataset[userId][achievementLookupName] ?
          dataset[userId][achievementLookupName].progress[0] : 0,
        guild,
        cb,
      });
    },
  });
};

const getRarityData = ({ userId, cb = () => {} }) => {
  getJson({
    path: DATA_PATH,
    key: 'achievementData',
    cb: (achievementData) => {
      const achievementCount = {
        mythic: 0,
        legendary: 0,
        epic: 0,
        rare: 0,
      };
      const userAchievementData = achievementData[userId] || {};
      // AchievementData is an object with userIds mapped to achievements gained
      Object.keys(userAchievementData).forEach((achievement) => {
        const achievementObject = achievements[achievement];
        if (achievementObject
          && userAchievementData[achievement].progress >= achievementObject.threshold) {
          achievementCount[achievementObject.rarity] += 1;
        }
      });

      const returnArray = [];
      Object.keys(achievementCount).forEach((rarity) => {
        returnArray.push({
          key: rarity,
          value: achievementCount[rarity],
          color: getRarityColor(rarity),
        });
      });

      return cb(returnArray);
    },
  });
};

const getPatronData = ({ guild, userId, cb }) => {
  getJson({
    path: DATA_PATH,
    key: 'patData',
    cb: (patData) => {
      // Patdata is an object with userIds mapped to pats
      const userPats = patData[userId] && patData[userId].pats || [];
      const userIdsToPats = {};
      userPats.forEach((userPat) => {
        userIdsToPats[userPat.patronId] = (userIdsToPats[userPat.patronId] || 0) + 1;
      });
      const userIds = Object.keys(userIdsToPats);
      // Sort user ids from largest to smallest
      userIds.sort((userA, userB) => userIdsToPats[userB] - userIdsToPats[userA]);
      const topFive = userIds.slice(0, 5);
      return mapMemberNamesToData({
        userIds: topFive,
        dataset: userIdsToPats,
        valueFunc: (dataset, userId) => dataset[userId],
        guild,
        cb,
      });
    },
  });
};

const getChartData = ({ type, message, param, guild, cb = () => {} }) => {
  const author = message?.author || message?.user
  switch (type) {
    case 'pats':
      return getPatData(guild, cb);
    case 'achievements':
      return getAchievementData({ guild, achievement: param, cb });
    case 'rarities':
      let rarityMention;
      if (isDiscordCommand(message)) {
        rarityMention = message.guild.members.cache.get(param);
      } else {
        rarityMention = message.mentions.members.first();
      }
      const rarityUserId = rarityMention && rarityMention.id || author.id;
      return getRarityData({ guild, userId: rarityUserId, cb });
    case 'patrons':
      let patronMention;
      if (isDiscordCommand(message)) {
        patronMention = message.guild.members.cache.get(param);
      } else {
        patronMention = message.mentions.members.first();
      }
      const patronUserId = patronMention && patronMention.id || author.id;
      return getPatronData({ guild, userId: patronUserId, cb });
  }
  return cb();
};

const generateChart = ({ chartTitle, chartData, cb = () => {} }) => {
  let keys = [];
  let values = [];
  let colors = [];
  for (let dataPoint of chartData) {
    keys.push(dataPoint.key);
    values.push(dataPoint.value);
    colors.push(dataPoint.color);
  }
  const configuration = {
    type: 'bar',
    data: {
      labels: keys,
      datasets: [{
        label: chartTitle,
        data: values,
        backgroundColor: colors,
        borderWidth: 1,
      }],
    },
    options: {
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true,
          },
        }],
      },
    },
  };
  canvasRenderService.renderToBuffer(configuration)
    .then((image) => {
      return cb(image);
    });
};

const generateChartAndReply = (type, param, message) => {
  const author = message?.author || message?.user
  let replyFunction = getReplyFunction(message);
  getChartData({
    type,
    message,
    param,
    guild: message.guild,
    cb: (chartData) => {
      if (!chartData) {
        replyFunction(USAGE);
        return;
      }
      const chartTitle = type.charAt(0).toUpperCase() + type.slice(1);
      generateChart({ chartTitle, chartData, cb: (chartImage) => {
        if (!isDiscordCommand(message))
          message.delete();
        let embedMessage = new MessageEmbed();
        embedMessage.setThumbnail(author.displayAvatarURL({ dynamic: true }));
        embedMessage.setColor(message.guild.members.cache.get(author.id).displayColor || COLOR);
        embedMessage.setAuthor(message.guild.members.cache.get(author.id).displayName);
        embedMessage.setFooter(message?.cleanContent || `!chart ${type} ${param}`);
        embedMessage.attachFiles([{
          attachment: chartImage,
          name: `${type}.png`,
        }]);
        // Send the attachment
        replyFunction(embedMessage);
      }});
    },
  });
}

const handleDiscordMessage = (message) => {
  const cmd = splitArgsWithQuotes(message.content);
  const botCommand = cmd[0];

  if (botCommand === '!chart') {
    if (cmd.length < 2) {
      message.channel.send(USAGE);
      return;
    }
    let extraParams = cmd.length > 2 ? cmd[2] : '';
    extraParams = extraParams.replace(/"/g, '');
    generateChartAndReply(cmd[1], extraParams, message);
  }
};

const handleDiscordCommand = (interaction) => {
  interaction.defer();
  if (interaction.commandName === 'chart') {
    const subCommandName = interaction.options[0]?.name;
    const subCommandOptions = interaction.options[0]?.options;
    generateChartAndReply(subCommandName, subCommandOptions?.[0]?.value || '', interaction)
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
    name: 'chart',
    description: 'Displays charts and graphs of stored data.',
    options: [
      {
        name: 'pats',
        type: 'SUB_COMMAND',
        description: 'Charts out all member\'s and how many pats they have.',
      },
      {
        name: 'patrons',
        type: 'SUB_COMMAND',
        description: 'Charts out all member\'s who have patted you or a member you specify.',
        options: [
          {
            name: 'user',
            description: 'The user you want to specify for the chart.',
            type: 'USER',
            required: false,
          }
        ]
      },
      {
        name: 'achievements',
        type: 'SUB_COMMAND',
        description: 'Charts out members who have earned progress towards an achievement.',
        options: [
          {
            name: 'achievement',
            description: 'The name of the achievement you want to chart.',
            type: 'STRING',
            required: true,
          }
        ]
      },
      {
        name: 'rarities',
        type: 'SUB_COMMAND',
        description: 'Charts out the different kind of achievement rarities that you or another member has earned.',
        options: [
          {
            name: 'user',
            description: 'The user you want to specify for the chart.',
            type: 'USER',
            required: false,
          }
        ]
      },
    ],
  },
];

module.exports = {
  onText,
  commandData,
};
