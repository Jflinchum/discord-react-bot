'use strict';

const onTextHooks = [
  require('./add').onText,
  require('./post').onText,
  require('./list').onText,
  require('./remove').onText,
  require('./help').onText,
  require('./markov').onText,
  require('./rename').onText,
  require('./play').onText,
  require('./append').onText,
  require('./trigger').onText,
  require('./gpt2').onText,
  require('./cron').onText,
  require('./google/calendar').onText,
  require('./roll').onText,
  require('./set').onText,
  require('./pat').onText,
  require('./userGroups').onText,
  require('./changeIcon').onText,
  require('./chart').onText,
];

module.exports = { onTextHooks };
