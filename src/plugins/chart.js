'use strict';
const { CanvasRenderService } = require('chartjs-node-canvas');
const { COLOR, COLOR_FORMATTED, getJson, DATA_PATH, splitArgsWithQuotes } = require('./util');
const USAGE = '`usage: !chart <pats/achievements> ["achievementName"]`';

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

const getChartData = ({ type, param, guild, cb = () => {} }) => {
  switch (type) {
    case 'pats':
      return getPatData(guild, cb);
    case 'achievements':
      return getAchievementData({ guild, achievement: param, cb });
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
    getChartData({ type: cmd[1], param: extraParams, guild: message.guild, cb: (chartData) => {
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
              text: message.content,
            },
          },
          files: [{
            attachment: chartImage,
            name: `${cmd[1]}.png`,
          }],
        });
      }});
    }});
  }
};

module.exports = {
  onText,
};
