'use strict';
const fetch = require('node-fetch');
const { config } = require('./util');

const API_URL = 'https://api-inference.huggingface.co/models/Scoops/SandalBot';
const headers = { Authorization: `Bearer ${config.huggingFaceToken}` };

const generateAndRespond = (message, content) => {
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
      console.log(response);
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
