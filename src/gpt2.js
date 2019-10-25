'use strict';
const { makeEmbed, makeEmbedNoUser } = require('./util');
const { spawn } = require('child_process');

const MAX_LENGTH = 2000;
const gpt2 = spawn('python', ['./src/gpt2/interactive_conditional_samples.py']);
let gpt2Request = [];


gpt2.stdout.on('data', (data) => {
  console.log(data.toString());
  const request = gpt2Request.shift();
  const channel = request.origin.channel;
  const author = request.origin.author;
  const prompt = request.prompt.split(' ');
  let promptSplit = [];
  // Asteriks for bold prompt
  let temp = '**';
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
  let response = data.toString().trim().split(' ');
  let messageSplit = promptSplit;
  // Cap off the temp variable with asteriks
  temp += '** ';
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
        makeEmbed(
          message,
          author,
          `Response [${index + 1}/${messageSplit.length}]`
        )
      );
    });
  } else if (channel) {
    messageSplit.map((message, index) => {
      channel.send(
        makeEmbedNoUser(
          message,
          `Response [${index + 1}/${messageSplit.length}]`
        )
      );
    });
  }
});

gpt2.stderr.on('data', (data) => {
  console.log(data.toString());
});

const promptGpt2 = (prompt, message) => {
  // Store the message id at
  gpt2Request.push({
    origin: message,
    prompt,
  });
  message.delete();
  gpt2.stdin.write(prompt.toString() + '\n');
  gpt2.stdin.write('<|endoftext|>\n');
};

module.exports = {
  promptGpt2,
};
