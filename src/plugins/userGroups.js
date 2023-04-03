'use strict';
const { ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
const {
  DATA_PATH,
  addJson,
  getJson,
  splitArgsWithQuotes,
  sendTextBlock,
  isDiscordCommand,
  getReplyFunction,
} = require('./util');
const fs = require('fs');

const USERGROUP_USAGE = '`usage: !userGroup add/remove/sub/unsub/rename`';
const ADD_USAGE = '`usage: !userGroup add "Example Group" colorCode`';
const REMOVE_USAGE = '`usage: !userGroup remove "Example Group"`';
const SUBSCRIBE_USAGE = '`usage: !userGroup sub "Role Name"`';
const UNSUBSCRIBE_USAGE = '`usage: !userGroup unsub "Role Name"`';
const RENAME_USAGE = '`usage: !userGroup rename "Old Role Name" "New Role Name"`';

/**
 * Creates a user group role for the guild
 *
 * @param {String} userGroup - The user group role to create
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 */
const addUserGroup = (userGroup, color, message) => {
  const author = message?.author || message?.user;
  let replyFunction = getReplyFunction(message);
  console.log(userGroup);
  getJson({
    path: DATA_PATH,
    key: `userGroupsConfig.${message.guild.id}.userGroups`,
    cb: (userGroups) => {
      const role = userGroups.filter(e => e.name === userGroup);
      if (role.length > 0) {
        replyFunction('User group already created.');
        return;
      }
      message.guild.roles.create({
        name: userGroup,
        permissions: [],
        mentionable: true,
        color,
        reason: `Created by ${author.username}.`,
      }).then((role) => {
        addJson(({
          path: DATA_PATH,
          key: `userGroupsConfig.${message.guild.id}.userGroups`,
          value: {
            id: role.id,
            name: role.name,
          },
          cb: () => {
            replyFunction(`${userGroup} successfully created.`);
          },
        }));
      }).catch((err) => {
        replyFunction('Could not create role: ' + err);
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
  const author = message?.author || message?.user;
  let replyFunction = getReplyFunction(message);
  getJson({
    path: DATA_PATH,
    key: `userGroupsConfig.${message.guild.id}.userGroups`,
    cb: (userGroups) => {
      const roles = userGroups.filter(e => e.name === userGroup);
      if (roles.length === 0) {
        replyFunction(`Could not find ${userGroup} in user groups.`);
        return;
      }
      const role = roles[0];
      const groupsWithoutRole = userGroups.filter(e => e.id !== role.id);
      const discordRole = message.guild.roles.cache.find(e => e.id === role.id);
      discordRole.delete(`Deleted by ${author.username}.`)
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
            replyFunction(`${discordRole.name} successfully deleted!`);
          });
        }).catch((err) => {
          replyFunction('Could not delete the role:' + err);
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
  let replyFunction = getReplyFunction(message);
  getJson({
    path: DATA_PATH,
    key: `userGroupsConfig.${message.guild.id}.userGroups`,
    cb: (userGroups) => {
      const role = userGroups.filter(e => e.name === userGroup);
      if (role.length === 0) {
        replyFunction('Could not find user group.');
        return;
      }
      message.guild.roles.fetch(role[0].id).then((discordRole) => {
        message.member.roles.add(discordRole).then(() => {
          replyFunction(`Successfully subscribed to ${role[0].name}!`);
        }).catch((err) => {
          replyFunction(`Unable to subscribe to ${role[0].name}`);
          console.log(err);
        });
      }).catch((err) => {
        console.log(err);
        replyFunction('Could not find discord role.');
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
  let replyFunction = getReplyFunction(message);
  getJson({
    path: DATA_PATH,
    key: `userGroupsConfig.${message.guild.id}.userGroups`,
    cb: (userGroups) => {
      const role = userGroups.filter(e => e.name === userGroup);
      if (role.length === 0) {
        replyFunction('Could not find user group.');
        return;
      }
      message.guild.roles.fetch(role[0].id).then((discordRole) => {
        message.member.roles.remove(discordRole).then(() => {
          replyFunction(`Successfully unsubscribed to ${role[0].name}!`);
        }).catch((err) => {
          replyFunction(`Unable to unsubscribe to ${role[0].name}`);
          console.log(err);
        });
      }).catch((err) => {
        console.log(err);
        replyFunction('Could not find discord role.');
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
      sendTextBlock({ text: userGroupList, message, page });
    },
  });
};

const renameUserGroup = (oldGroup, newGroup, message) => {
  let replyFunction = getReplyFunction(message);
  getJson({
    path: DATA_PATH,
    key: `userGroupsConfig.${message.guild.id}.userGroups`,
    cb: (userGroups) => {
      const role = userGroups.filter(e => e.name === oldGroup);
      if (role.length === 0) {
        replyFunction('Could not find user group to rename.');
        return;
      }
      message.guild.roles.fetch(role[0].id).then((discordRole) => {
        discordRole.edit({ name: newGroup }).then(() => {
          fs.readFile(DATA_PATH, (err, data) => {
            if (err) {
              console.log(err);
              return;
            }
            data = JSON.parse(data);
            // Modify local storage to match the name change
            data.userGroupsConfig[`${message.guild.id}`].userGroups.forEach(userGroup => {
              if (userGroup.id === role[0].id) {
                userGroup.name = newGroup;
              }
            });
            fs.writeFileSync(DATA_PATH, JSON.stringify(data));
            replyFunction(`Successfully renamed ${oldGroup} to ${newGroup}!`);
          });
        }).catch((err) => {
          replyFunction(`Unable to rename ${oldGroup}`);
          console.log(err);
        });
      }).catch((err) => {
        console.log(err);
        replyFunction('Could not find discord role.');
      });
    },
  });
};

const handleDiscordMessage = (message) => {
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
      addUserGroup(cmd[2].replace(/"/g, ''), cmd[3], message);
    } else if (userGroupCommand === 'remove') {
      if (cmd.length < 3) {
        message.channel.send(REMOVE_USAGE);
        return;
      }
      removeUserGroup(cmd[2].replace(/"/g, ''), message);
    } else if (userGroupCommand === 'sub') {
      if (cmd.length < 3) {
        message.channel.send(SUBSCRIBE_USAGE);
        return;
      }
      subscribeUserGroup(cmd[2].replace(/"/g, ''), message);
    } else if (userGroupCommand === 'unsub') {
      if (cmd.length < 3) {
        message.channel.send(UNSUBSCRIBE_USAGE);
        return;
      }
      unsubscribeUserGroup(cmd[2].replace(/"/g, ''), message);
    } else if (userGroupCommand === 'list') {
      const page = cmd[2];
      listUserGroups(message, page);
    } else if (userGroupCommand === 'rename') {
      if (cmd.length < 4) {
        message.channel.send(RENAME_USAGE);
        return;
      }
      renameUserGroup(cmd[2].replace(/"/g, ''), cmd[3].replace(/"/g, ''), message);
    }
  }
};

const handleDiscordCommand = (interaction) => {
  if (interaction.commandName === 'user_group') {
    const subCommandName = interaction.options[0]?.name;
    const subCommandOptions = interaction.options[0]?.options;
    if (subCommandName === 'list') {
      const page = subCommandOptions?.[0]?.value;
      listUserGroups(interaction, page);
    } else if (subCommandName === 'add') {
      const name = subCommandOptions?.[0]?.value;
      const colorCode = subCommandOptions?.[1]?.value;
      addUserGroup(name, colorCode, interaction);
    } else if (subCommandName === 'remove') {
      const name = subCommandOptions?.[0]?.value;
      removeUserGroup(name, interaction);
    } else if (subCommandName === 'sub') {
      const name = subCommandOptions?.[0]?.value;
      subscribeUserGroup(name, interaction);
    } else if (subCommandName === 'unsub') {
      const name = subCommandOptions?.[0]?.value;
      unsubscribeUserGroup(name, interaction);
    } else if (subCommandName === 'rename') {
      const oldName = subCommandOptions?.[0]?.value;
      const newName = subCommandOptions?.[1]?.value;
      renameUserGroup(oldName, newName, interaction);
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
    name: 'user_group',
    description: 'Manages user groups for the guild.',
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        name: 'list',
        type: ApplicationCommandOptionType.Subcommand,
        description: 'Lists out all user groups for the guild.',
        options: [
          {
            name: 'page',
            description: 'The page of the user group list.',
            type: ApplicationCommandOptionType.Integer,
            autocomplete: true,
            required: false,
          },
        ],
      },
      {
        name: 'add',
        type: ApplicationCommandOptionType.Subcommand,
        description: 'Add a user group to the guild.',
        options: [
          {
            name: 'name',
            description: 'The name of the user group. Creates a role under this name.',
            type: ApplicationCommandOptionType.String,
            autocomplete: true,
            required: true,
          },
          {
            name: 'color_code',
            type: ApplicationCommandOptionType.String,
            autocomplete: true,
            description: 'The color of the user group. (i.e. FFFFFF)',
            required: false,
          }
        ]
      },
      {
        name: 'remove',
        type: ApplicationCommandOptionType.Subcommand,
        description: 'Removes a user group from the guild.',
        options: [
          {
            name: 'name',
            description: 'The name of the user group you want to remove.',
            type: ApplicationCommandOptionType.String,
            autocomplete: true,
            required: true,
          }
        ]
      },
      {
        name: 'sub',
        type: ApplicationCommandOptionType.Subcommand,
        description: 'Subscibes yourself to a user group.',
        options: [
          {
            name: 'name',
            description: 'The name of the user group you want to subscribe to.',
            type: ApplicationCommandOptionType.String,
            autocomplete: true,
            required: true,
          }
        ]
      },
      {
        name: 'unsub',
        type: ApplicationCommandOptionType.Subcommand,
        description: 'Unsubscribes you from a user group.',
        options: [
          {
            name: 'name',
            description: 'The name of the user group you want to unsubscribe to.',
            type: ApplicationCommandOptionType.String,
            autocomplete: true,
            required: true,
          }
        ]
      },
      {
        name: 'rename',
        type: ApplicationCommandOptionType.Subcommand,
        description: 'Renames a user group.',
        options: [
          {
            name: 'old_name',
            description: 'The current name of the user group that you want to rename.',
            type: ApplicationCommandOptionType.String,
            autocomplete: true,
            required: true,
          },
          {
            name: 'new_name',
            type: ApplicationCommandOptionType.String,
            autocomplete: true,
            description: 'The new name of the user group.',
            required: true,
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
