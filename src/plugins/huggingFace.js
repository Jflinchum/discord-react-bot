'use strict';
const fetch = require('node-fetch');
const { config } = require('./util');

const API_URL = 'https://api-inference.huggingface.co/models/Scoops/SandalBot';
const headers = { Authorization: `Bearer ${config.huggingFaceToken}` };

const generateAndRespond = (message, content) => {
    message.channel.startTyping();
    const body = JSON.stringify({ inputs: { text: content } })
    console.log(`Responding with GPT2 to: ${body}`);
    fetch(
        API_URL,
        {
            headers,
            method: 'POST',
            body,
        }
    )
    .then((response) => response.json())
    .then((response) => {
      message.channel.stopTyping();
      if (response.error) {
        message.reply(`Error: ${JSON.stringify(response.error)}`);
        return;
      }
      message.reply(response.generated_text);
    });
};

const respondToMentions = (message) => {
  if (config.huggingFaceToken) {
    const content = message.cleanContent;
    generateAndRespond(message, content);
  }
};

module.exports = {
  respondToMentions
};
