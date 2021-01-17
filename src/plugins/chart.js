'use strict';
const { CanvasRenderService } = require('chartjs-node-canvas');
const { COLOR, COLOR_FORMATTED, getJson, DATA_PATH, splitArgsWithQuotes } = require('./util');
const achievements = require('./../../achievements') || {};
const { getRarityColor } = require('./../titles');
const USAGE = '`usage: !chart <pats/achievements/rarities> ["achievementName"/@user]`';

const width = 400; // px
const height = 400; // px
const fontColor = 'white';
const fontFamily = 'cambria';
const chartCallback = (ChartJS) => {
  ChartJS.defaults.global.defaultFontColor = fontColor;
  ChartJS.defaults.global.defaultFontFamily = fontFamily;
};
const canvasRenderService = new CanvasRenderService(width, height, chartCallback);

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
      let promiseArray = [];
      for (let i = 0; i < topFive.length; i++) {
        promiseArray.push(new Promise((resolve, reject) => {
          const userId = topFive[i];
          guild.members.fetch(userId).then((member) => {
            if (member) {
              return resolve({
                key: member.displayName,
                value: patData[userId].pats.length,
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
      userIds.sort((userA, userB) => {
        const userBAchievementProgress = achievementData[userB][achievement] ?
          achievementData[userB][achievement].progress[0] : 0;
        const userAAchievementProgress = achievementData[userA][achievement] ?
          achievementData[userA][achievement].progress[0] : 0;
        return userBAchievementProgress - userAAchievementProgress;
      });
      const topFive = userIds.slice(0, 5);
      let promiseArray = [];
      for (let i = 0; i < topFive.length; i++) {
        promiseArray.push(new Promise((resolve, reject) => {
          const userId = topFive[i];
          guild.members.fetch(userId).then((member) => {
            if (member) {
              return resolve({
                key: member.displayName,
                value: achievementData[userId][achievement] ?
                  achievementData[userId][achievement].progress[0] : 0,
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
    },
  });
};

const getRarityData = ({ guild, userId, cb = () => {} }) => {
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
      const userAchievementData = achievementData[userId];
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

const getChartData = ({ type, message, param, guild, cb = () => {} }) => {
  switch (type) {
    case 'pats':
      return getPatData(guild, cb);
    case 'achievements':
      return getAchievementData({ guild, achievement: param, cb });
    case 'rarities':
      const firstMention = message.mentions.members.first();
      const userId = firstMention && firstMention.id || message.author.id;
      return getRarityData({ guild, userId: userId, cb });
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

const onText = (message, bot) => {
  const cmd = splitArgsWithQuotes(message.content);
  const botCommand = cmd[0];

  if (botCommand === '!chart') {
    if (cmd.length < 2) {
      message.channel.send(USAGE);
      return;
    }
    let extraParams = cmd.length > 2 ? cmd[2] : '';
    extraParams = extraParams.replace(/\"/g, '');
    getChartData({
      type: cmd[1],
      message,
      param: extraParams,
      guild: message.guild,
      cb: (chartData) => {
        if (!chartData) {
          message.channel.send(USAGE);
          return;
        }
        const chartTitle = cmd[1].charAt(0).toUpperCase() + cmd[1].slice(1);
        generateChart({ chartTitle, chartData, cb: (chartImage) => {
          message.delete();
          // Send the attachment
          message.channel.send({
            embed: {
              thumbnail: {
                url: `${message.author.displayAvatarURL({ dynamic: true })}`,
              },
              color: message.guild.member(message.author.id).displayColor || COLOR,
              author: {
                name: message.author.username,
              },
              footer: {
                text: message.cleanContent,
              },
            },
            files: [{
              attachment: chartImage,
              name: `${cmd[1]}.png`,
            }],
          });
        }});
      },
    });
  }
};

module.exports = {
  onText,
};
