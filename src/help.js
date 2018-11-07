'use strict';
const fs = require('fs');
const path = require('path');

exports.help = (message) => {
  message.delete();
  const helpText = fs.readFileSync(
    `${path.dirname(require.main.filename)}/help.txt`
  );
  message.channel.send(`\`\`\`${helpText}\`\`\``);
};
