'use strict';

const onTextHooks = [
  require('./add').onText,
  require('./post').onText,
  require('./list').onText,
  require('./remove').onText,
//require('./help').onText,
  require('./rename').onText,
  require('./play').onText,
//require('./trigger').onText,
//require('./cron').onText,
//require('./set').onText,
  require('./pat').onText,
//require('./chart').onText,
//require('./roll').onText,
//require('./changeIcon').onText,
];

const onUserCommandHooks = [
  require('./pat').onUserCommand,
];

const commandData = [
  ...require('./help').commandData,
  ...require('./pat').commandData,
  ...require('./roll').commandData,
  ...require('./post').commandData,
  ...require('./play').commandData,
  ...require('./rename').commandData,
  ...require('./list').commandData,
  ...require('./remove').commandData,
  ...require('./changeIcon').commandData,
  ...require('./set').commandData,
  ...require('./cron').commandData,
  ...require('./chart').commandData,
  ...require('./trigger').commandData,
  ...require('./add').commandData,
];

module.exports = { onTextHooks, onUserCommandHooks, commandData };
