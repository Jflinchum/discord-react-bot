'use strict';
const fs = require('fs');
const { PATH, makeEmbed } = require('./util');
const USAGE = '`usage: [!rename/!rn] <oldName> <newName>`';

/**
 * Renames a file in the local storage space
 *
 * @param {String} oldName - The file to rename
 * @param {String} newName - The new name to give the file
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 */
const rename = (oldName, newName, message) => {
  message.delete();
  const files = fs.readdirSync(PATH);
  if (!oldName) {
    message.channel.send(USAGE);
    return;
  }
  let oldFile;
  let newFile;
  // Find the file associated with the name
  for (let i = 0; i < files.length; i++) {
    if (files[i].substr(0, files[i].lastIndexOf('.')) === oldName) {
      oldFile = files[i];
    }
    if (files[i].substr(0, files[i].lastIndexOf('.')) === newName) {
      newFile = files[i];
    }
  }
  // If the file does not exist
  if (!oldFile) {
    message.channel.send(`Could not find ${oldName}.`);
    return;
  } else if (newFile) {
    // All files should have unique names
    message.channel.send('New file name already exists');
  } else {
    const exten = oldFile.substr(oldFile.lastIndexOf('.') + 1);
    const oldPath = `${PATH}/${oldFile}`;
    const newPath = `${PATH}/${newName}.${exten}`;
    fs.rename(oldPath, newPath, (err) => {
      if (err) {
        message.channel.send('Could not rename file.');
        return;
      }
      message.channel.send(
        makeEmbed({
          message: `Renamed ${oldName} to ${newName}`,
          user: message.author,
        })
      );
    });
  }
};

const onText = (message) => {
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];

  if (botCommand === '!rename' || botCommand === '!rn') {
    const oldFile = cmd[1];
    const newFile = cmd[2];
    rename(oldFile, newFile, message);
  }
};

module.exports = {
  rename,
  onText,
};
