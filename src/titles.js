'use strict';
let configuredTitles = {};
const { addJson, getJson, DATA_PATH, config, makeEmbed } = require('./plugins/util');
const { readFileSync } = require('fs');

// Achievements configurations is optional
try {
  configuredTitles = require('./../achievements.js');
} catch (err) {}

const awardAchievement = ({ user, achievement, rarity, guild, achievementChannel }) => {
  if (config.achievementChannelId) {
    achievementChannel.send(`<@${user.id}>`,
      makeEmbed({
        message: getCongratsText(user, achievement, rarity),
        user,
        title: guild.member(user.id).displayName,
        color: getRarityColor(rarity),
      })
    );
  }
  const achievementRole = guild.roles.cache.findKey(role => role.name === achievement);
  // Find the existing role. If it doesn't exist, make it
  if (!achievementRole) {
    guild.roles.create({
      data: {
        name: achievement,
        permissions: [],
        mentionable: false,
        color: getRarityColor(rarity),
      },
      reason: `Created by ${user.username}.`,
    }).then((role) => {
      guild.member(user.id).roles.add(role);
    });
  } else {
    guild.member(user.id).roles.add(achievementRole);
  }
};

const checkProgressAndAward = ({
  user,
  achievementLabel,
  achievementObject,
  guild,
  achievementChannel,
  newProgress,
}) => {
  return new Promise((resolve) => {
    getJson({
      path: DATA_PATH,
      key: `achievementData.${user.id}`,
      cb: (userAchievements) => {
        const userCurrentAchievement =
          (userAchievements && userAchievements[achievementLabel]) || {};

        let progress = userCurrentAchievement.progress ? userCurrentAchievement.progress[0] : 0;
        if (newProgress) {
          progress = newProgress;
        } else {
          // Increment the user's progress
          progress++;
        }
        if (progress === achievementObject.threshold) {
          awardAchievement({
            user,
            achievement: achievementLabel,
            rarity: achievementObject.rarity,
            guild,
            achievementChannel,
          });
        }
        addJson({
          path: DATA_PATH,
          key: `achievementData.${user.id}.${achievementLabel}.progress`,
          value: progress,
          append: false,
          cb: () => resolve(),
        });
      },
    });
  });
};

// eslint-disable-next-line
const clearAchievements = ({ user }) => {
  addJson({
    path: DATA_PATH,
    key: `achievementData.${user.id}`,
    value: {},
    cb: () => {},
  });
};

const achievementAPI = {
  getAchievements: (userId) => {
    // This must be syncronous since achievements are syncronous
    const dataObject = JSON.parse(readFileSync(DATA_PATH));
    return dataObject.achievementData && dataObject.achievementData[userId] || {};
  },
};

const onEvent = ({ event, data, user, guild, bot }) => {
  // Don't check bot messages
  if (user.bot) {
    return;
  }
  const achievementChannel = bot.channels.cache.get(config.achievementChannelId);

  const titleNames = Object.keys(configuredTitles);
  // Synchronize the promises so the system has time for i/o when storing user state
  titleNames.reduce((accPromise, title) => {
    let achievementObject = configuredTitles[title];

    let userToAward;
    switch (event) {
      case 'text':
        userToAward = achievementObject.onText && achievementObject.onText(data, achievementAPI);
        break;
      case 'reaction':
        userToAward = achievementObject.onReaction && achievementObject.onReaction(
          data,
          user,
          achievementAPI
        );
        break;
      case 'guildMemberUpdate':
        userToAward = achievementObject.onGuildMemberUpdate &&
          achievementObject.onGuildMemberUpdate(data.oldMember, data.newMember, achievementAPI);
        break;
      case 'voiceStateUpdate':
        userToAward = achievementObject.onVoiceStateUpdate &&
          achievementObject.onVoiceStateUpdate(
            data.oldVoiceState,
            data.newVoiceState,
            achievementAPI
          );
        break;
      case 'presenceUpdate':
        userToAward = achievementObject.onPresenceUpdate &&
          achievementObject.onPresenceUpdate(
            data.oldPresence,
            data.newPresence,
            achievementAPI
          );
    }
    if (userToAward && userToAward.user && userToAward.user.id && !userToAward.user.bot) {
      return accPromise.then(() => {
        return checkProgressAndAward({
          user: userToAward.user,
          achievementObject,
          achievementLabel: title,
          guild,
          achievementChannel,
          newProgress: userToAward.progress,
        });
      });
    } else {
      return accPromise.then(() => {
        return Promise.resolve();
      });
    }
  }, Promise.resolve());
};

const getRarityColor = (rarity) => {
  switch (rarity) {
    case ('rare'):
      return '#0070dd';
    case ('epic'):
      return '#a335ee';
    case ('legendary'):
      return '#ff8000';
    case ('mythic'):
      return '#ff4040';
  }
};

const getCongratsText = (user, achievement, rarity) => {
  let message = `Congratulations <@${user.id}>! You've earned the title: '${achievement}'`;
  message += `\nRarity: ${rarity.charAt(0).toUpperCase() + rarity.slice(1)}`;
  return message;
};

module.exports = {
  onEvent,
  getRarityColor,
};
