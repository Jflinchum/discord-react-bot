'use strict';

const onTextHooks = [
  require('./add').onText,
  require('./list').onText,
  require('./pat').onText,
  require('./play').onText,
  require('./post').onText,
  require('./remove').onText,
  require('./rename').onText,
//require('./changeIcon').onText,
//require('./chart').onText,
//require('./cron').onText,
//require('./help').onText,
//require('./roll').onText,
//require('./set').onText,
//require('./trigger').onText,
];

const onUserCommandHooks = [
  require('./pat').onUserCommand,
];

const commandData = [
  ...require('./add').commandData,
  ...require('./list').commandData,
  ...require('./pat').commandData,
  ...require('./play').commandData,
  ...require('./post').commandData,
  ...require('./remove').commandData,
  ...require('./rename').commandData,
  //...require('./changeIcon').commandData,
  //...require('./chart').commandData,
  //...require('./cron').commandData,
  //...require('./help').commandData,
  //...require('./roll').commandData,
  //...require('./set').commandData,
  //...require('./trigger').commandData,
];

module.exports = { onTextHooks, onUserCommandHooks, commandData };
