'use strict';
const { makeEmbed, makeEmbedNoUser, config } = require('./util');
const { spawn } = require('child_process');

const MAX_LENGTH = 2000;
let gpt2;
let gpt2Request = [];
const gpt2Enabled = config.gpt2Enabled;
if (gpt2Enabled) {
  gpt2 = spawn(
    'python',
    ['./src/plugins/gpt2/interactive_conditional_samples.py']
  );
  gpt2.stdout.on('data', (data) => {
    const request = gpt2Request.shift();
    const channel = request.origin.channel;
    const author = request.origin.author;
    const title = request.title || '';
    const prompt = request.prompt.split(' ');
    let promptSplit = [];
    // Asteriks for bold prompt
    let temp = '';
    if (request.printPrompt) {
      temp += '**';
      prompt.map((promptString) => {
        // Check to see if adding to the string would go over max length
        if ((temp.length + promptString.length) > MAX_LENGTH) {
          promptSplit.push(`${temp}** `);
          temp = `**${promptString} `;
        } else {
          // If it doesn't go over max length, add it to the temp string
          temp += `${promptString} `;
        }
      });
      temp += '** ';
    }
    let response = data.toString().trim().split(' ');
    let messageSplit = promptSplit;
    // Cap off the temp variable with asteriks
    response.map((messageString) => {
      if ((temp.length + messageString.length) > MAX_LENGTH) {
        messageSplit.push(`${temp} `);
        temp = `${messageString} `;
      } else {
        // If it doesn't go over max length, add it to the temp string
        temp += `${messageString} `;
      }
    });
    messageSplit.push(temp);
    if (channel && author) {
      messageSplit.map((message, index) => {
        channel.send(
          makeEmbed({
            message,
            user: author,
            title: `${title} Response [${index + 1}/${messageSplit.length}]`,
          })
        );
      });
    } else if (channel) {
      messageSplit.map((message, index) => {
        channel.send(
          makeEmbedNoUser(
            message,
            `${title} Response [${index + 1}/${messageSplit.length}]`
          )
        );
      });
    }
  });

  gpt2.stderr.on('data', (data) => {
    console.log(data.toString());
  });
}

const promptGpt2 = (prompt, message, printPrompt = true, title = '') => {
  // Store the message id at
  gpt2Request.push({
    origin: message,
    prompt,
    printPrompt,
    title,
  });
  message.delete();
  gpt2.stdin.write(prompt.toString() + '\n');
  gpt2.stdin.write('<|endoftext|>\n');
};

const promptRelevanceGpt2 = (originMessage, channel, n = 10) => {
  let messageArray = [];
  channel.messages.fetch({ limit: n })
    .then(messages => {
      messages.each((message) => {
        if (message.cleanContent.length > 0) {
          messageArray.unshift(message);
        }
      });

      let gpt2String = '';
      messageArray.map((message) => {
        gpt2String += `[${
          message.author.username
        }]: ${message.cleanContent}\n\n`;
      });
      console.log(gpt2String);
      if (!gpt2String) {
        channel.send('Could not find text messages!');
      }
      promptGpt2(gpt2String, originMessage, false, channel.name);
    });
};

const onText = (message) => {
  const cmd = message.content.split(' ');
  const botCommand = cmd[0];

  if (gpt2Enabled && botCommand === '!gpt2') {
    let string = cmd.slice(1).join(' ');
    const channel = message.mentions.channels.first();
    let numOfMessages;
    if (cmd.length > 2) {
      numOfMessages = cmd[2];
    }
    if (numOfMessages > 100) {
      numOfMessages = 100;
    }
    if (channel) {
      promptRelevanceGpt2(message, channel, numOfMessages);
    } else {
      promptGpt2(string, message);
    }
  }
};


module.exports = {
  promptGpt2,
  promptRelevanceGpt2,
  onText,
};
