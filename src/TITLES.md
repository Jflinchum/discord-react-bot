### Titles / Achievements
The way achievements works is the bot looks at the root directory for an `achievements.js` file. That achievements file defines the titles of the achievements, the threshold the user needs to pass in order to get that achievement, the rarity (rare, epic, and legendary), and finally a list of event functions (currently onText and onReaction).

Whenever the bot receives a message or reaction, it iterates over the list of achievements and calls the appropriate event function, passing some data it received from discord. For messages, the message is passed as a param. For reactions, both the reaction and the user creating the reaction is passed.

If the function returns a discord user, then it awards that user with progress towards that achievement. Once it passes the threshold set, it creates a role on the server and assigns it that user. It will also message the `achievementChannelId` that's configured in config.json.

#### Example `achievements.js` file:
```
const achievements = {
  "Stop": {
    threshold: 5,
    rarity: 'rare',
    onText: (message) => {
      return message.cleanContent.includes('🛑') ? message.author : undefined;
    },
    onReaction: (reaction, user) => {
      let skipEmojiCheck = reaction._emoji.name === '🛑';
      return skipEmojiCheck ? user : undefined;
    }
  },
};

module.exports = achievements;
```
