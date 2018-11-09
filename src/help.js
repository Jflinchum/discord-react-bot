'use strict';
const fs = require('fs');
const path = require('path');

/**
 * Posts the contents of the help file to the channel
 *
 * @param {Object} message - The Discord Message Object that initiated
 * the command
 */
const help = (message) => {
  message.delete();
  const helpText = fs.readFileSync(
    `${path.dirname(require.main.filename)}/help.txt`
  );
  message.channel.send(`\`\`\`${helpText}\`\`\``);
};

module.exports = {
  help,
};
