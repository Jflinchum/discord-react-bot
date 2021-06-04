'use strict';
const fetch = require('node-fetch');
const { config } = require('./util');

const API_URL = 'https://api-inference.huggingface.co/models/Scoops/SandalBot';
const headers = { Authorization: `Bearer ${config.huggingFaceToken}` };

const generateAndRespond = (message, content) => {
    message.channel.startTyping();
    const body = JSON.stringify({ inputs: { text: content } })
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
      if (!response.generated_text) {
        message.channel.send(`Error: ${JSON.stringify(response)}`);
        return;
      }
      message.channel.send(response.generated_text);
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
