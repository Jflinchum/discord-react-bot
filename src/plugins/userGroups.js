'use strict';
const {
  DATA_PATH,
  addJson,
  getJson,
  splitArgsWithQuotes,
  sendTextBlock,
} = require('./util');
const fs = require('fs');

const USERGROUP_USAGE = '`usage: !userGroup add/remove/sub/unsub`';
const ADD_USAGE = '`usage: !userGroup add "Example Group" colorCode`';
const REMOVE_USAGE = '`usage: !userGroup remove "Example Group"`';
const SUBSCRIBE_USAGE = '`usage: !userGroup sub "Role Name"`';
const UNSUBSCRIBE_USAGE = '`usage: !userGroup unsub "Role Name"`';

/**
 * Creates a user group role for the guild
 *
 * @param {String} userGroup - The user group role to create
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 */
const addUserGroup = (userGroup, color, message) => {
  getJson({
    path: DATA_PATH,
    key: `userGroupsConfig.${message.guild.id}.userGroups`,
    cb: (userGroups) => {
      const role = userGroups.filter(e => e.name === userGroup.name);
      if (role.length > 0) {
        message.channel.send('User group already created!');
        return;
      }
      message.guild.roles.create({
        data: {
          name: userGroup,
          permissions: [],
          mentionable: true,
          color,
        },
        reason: `Created by ${message.author.username}.`,
      }).then((role) => {
        addJson(({
          path: DATA_PATH,
          key: `userGroupsConfig.${message.guild.id}.userGroups`,
          value: {
            id: role.id,
            name: role.name,
          },
          cb: () => {
            message.channel.send(`${userGroup} successfully created!`);
          },
        }));
      }).catch((err) => {
        message.channel.send('Could not create role: ' + err);
        console.log(err);
      });
    },
  });
};

/**
 * Removes a user group role for the guild
 *
 * @param {String} userGroup - The user group role to remove
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 */
const removeUserGroup = (userGroup, message) => {
  getJson({
    path: DATA_PATH,
    key: `userGroupsConfig.${message.guild.id}.userGroups`,
    cb: (userGroups) => {
      const roles = userGroups.filter(e => e.name === userGroup);
      if (roles.length === 0) {
        message.channel.send(`Could not find ${userGroup} in user groups.`);
        return;
      }
      const role = roles[0];
      const groupsWithoutRole = userGroups.filter(e => e.id !== role.id);
      const discordRole = message.guild.roles.cache.find(e => e.id === role.id);
      discordRole.delete(`Deleted by ${message.author.username}.`)
        .then(() => {
          fs.readFile(DATA_PATH, (err, data) => {
            if (err) {
              console.log(err);
              return;
            }
            data = JSON.parse(data);
            data.userGroupsConfig[`${message.guild.id}`].userGroups =
              groupsWithoutRole;
            fs.writeFileSync(DATA_PATH, JSON.stringify(data));
            message.channel.send(`${discordRole.name} successfully deleted!`);
          });
        }).catch((err) => {
          message.channel.send('Could not delete the role:' + err);
          console.log(err);
        });
    },
  });
};

/**
 * Adds the user who sent the message to the user group role
 *
 * @param {DiscordRoleObject} userGroup - The user group role to add the user to
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 */
const subscribeUserGroup = (userGroup, message) => {
  getJson({
    path: DATA_PATH,
    key: `userGroupsConfig.${message.guild.id}.userGroups`,
    cb: (userGroups) => {
      const role = userGroups.filter(e => e.name === userGroup);
      if (role.length === 0) {
        message.channel.send('Could not find user group.');
        return;
      }
      message.guild.roles.fetch(role[0].id).then((discordRole) => {
        message.member.roles.add(discordRole).then(() => {
          message.channel.send(`Successfully subscribed to ${role[0].name}!`);
        }).catch((err) => {
          message.channel.send(`Unable to subscribe to ${role[0].name}`);
          console.log(err);
        });
      }).catch((err) => {
        console.log(err);
        message.channel.send('Could not find discord role.');
      });
    },
  });
};

/**
 * Remove the user who sent the message from the user group role
 *
 * @param {String} userGroup - The user group role to remove the user from
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 */
const unsubscribeUserGroup = (userGroup, message) => {
  getJson({
    path: DATA_PATH,
    key: `userGroupsConfig.${message.guild.id}.userGroups`,
    cb: (userGroups) => {
      const role = userGroups.filter(e => e.name === userGroup);
      if (role.length === 0) {
        message.channel.send('Could not find user group.');
        return;
      }
      message.guild.roles.fetch(role[0].id).then((discordRole) => {
        message.member.roles.remove(discordRole).then(() => {
          message.channel.send(`Successfully unsubscribed to ${role[0].name}!`);
        }).catch((err) => {
          message.channel.send(`Unable to unsubscribe to ${role[0].name}`);
          console.log(err);
        });
      }).catch((err) => {
        console.log(err);
        message.channel.send('Could not find discord role.');
      });
    },
  });
};

/**
 * Lists all user groups saved
 *
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 * @param {Number} page - The page to turn to for user groups
 */
const listUserGroups = (message, page) => {
  getJson({
    path: DATA_PATH,
    key: `userGroupsConfig.${message.guild.id}.userGroups`,
    cb: (userGroups) => {
      let userGroupList = '';
      if (userGroups && userGroups.length) {
        userGroups.map((userGroup) => {
          userGroupList += ` - ${userGroup.name}\n`;
        });
      } else {
        userGroupList = 'No user groups configured!';
      }
      sendTextBlock({text: userGroupList, message, page});
    },
  });
};

const onText = (message, bot) => {
  const cmd = splitArgsWithQuotes(message.content);
  const botCommand = cmd[0];

  if (botCommand === '!userGroup') {
    if (cmd.length < 2) {
      message.channel.send(USERGROUP_USAGE);
      return;
    }
    const userGroupCommand = cmd[1];

    if (userGroupCommand === 'add') {
      if (cmd.length < 3) {
        message.channel.send(ADD_USAGE);
        return;
      }
      addUserGroup(cmd[2].replace(/\"/g, ''), cmd[3], message);
    } else if (userGroupCommand === 'remove') {
      if (cmd.length < 3) {
        message.channel.send(REMOVE_USAGE);
        return;
      }
      removeUserGroup(cmd[2].replace(/\"/g, ''), message);
    } else if (userGroupCommand === 'sub') {
      if (cmd.length < 3) {
        message.channel.send(SUBSCRIBE_USAGE);
        return;
      }
      subscribeUserGroup(cmd[2].replace(/\"/g, ''), message);
    } else if (userGroupCommand === 'unsub') {
      if (cmd.length < 3) {
        message.channel.send(UNSUBSCRIBE_USAGE);
        return;
      }
      unsubscribeUserGroup(cmd[2].replace(/\"/g, ''), message);
    } else if (userGroupCommand === 'list') {
      const page = cmd[2];
      listUserGroups(message, page);
    }
  }
};

module.exports = {
  onText,
};
