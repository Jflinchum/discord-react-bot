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

const commandData = [
  ...require('./help').commandData,
  ...require('./pat').commandData,
  ...require('./roll').commandData,
  ...require('./post').commandData,
  ...require('./play').commandData,
  ...require('./rename').commandData,
  ...require('./list').commandData,
  ...require('./markov').commandData,
  ...require('./remove').commandData,
];

module.exports = { onTextHooks, commandData };
