'use strict';
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const {
  config,
  makeEmbedNoUser,
  formatDateString,
  getJson,
  addJson,
} = require('./../util');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';
const STORED_EVENTS_PATH = 'events.json';
// Frequency in milliseconds to check for updates to the calendar
const UPDATE_FREQUENCY = 60 * 1000;
const CLEAR_REMINDER_USAGE = '`usage: !clearReminders <index>`';
const REMIND_ME_USAGE = '`usage: !remindMe <index> <time in minutes>`';
const REMIND_ME_PATH = './reminders.json';
// This is the scope of checking for any updates
// This is useful in solving the case in which there is a series of events
const getUpdateMaxTime = () => {
  return new Date(new Date().setMonth(new Date().getMonth() + 1));
};
let creds;

if (config.googleAPIEnabled) {
  // Load client secrets from a local file.
  creds = fs.readFileSync('credentials.json');
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Get all of the upcoming events and post it to the channel
 * Message content will take two parameters, one for the starting date and
 * another for the end date
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @param {Discord Message Object} message The discord message that spawned cmd
 */
function listEvents(auth, message) {
  const calendar = google.calendar({ version: 'v3', auth });
  const params = message.content.split(' ');
  let timeMin = new Date();
  if (params.length > 1) {
    if (!isNaN(new Date(params[1]))) {
      timeMin = new Date(params[1]);
    }
  }
  // Time max is set to one week out
  let timeMax = new Date(timeMin.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (params.length > 2) {
    if (!isNaN(new Date(params[2]))) {
      timeMax = new Date(params[2]);
    }
  }
  // Call the google api
  calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const events = res.data.items;
    let finalMessage = '';
    // Start concating all of the event summaries and times
    if (events.length) {
      events.map((event, i) => {
        let start = event.start.dateTime || event.start.date;
        start = formatDateString(new Date(start));
        finalMessage += `(${i + 1}) ${start} - ${event.summary}\n`;
      });
    } else {
      // If no events
      finalMessage += 'No upcoming events found.';
    }
    message.channel.send(
      makeEmbedNoUser(
        finalMessage,
        `Upcoming Events: (${formatDateString(timeMin).split(',')[0]}) - ` +
        `(${formatDateString(timeMax).split(',')[0]})` +
        `\n${config.timeZone}`,
        null,
        message.content
      )
    );
  });
}

/**
 * Gets all upcoming events between the current time and getUpdateMaxTime
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @param {Function} cb Callback function
 */
const getAllUpcomingEvents = (auth, cb) => {
  const calendar = google.calendar({ version: 'v3', auth });
  calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    timeMax: getUpdateMaxTime(),
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, resp) => {
    if (err) return cb(err);
    return cb(null, resp.data.items);
  });
};

/**
 * Gets an event out of the array by id
 * @param {Array} events Array of google event objects
 * @param {String} id The id of the google event to get
 */
const getEventById = (events, id) => {
  return events.filter(event => event.id === id);
};

/**
 * Gets the diff between the events passed as a parameter and the locally stored
 * events. Calls the callback function with { removedEvents, addedEvents }
 * @param {Array} events A list of events
 * @param {Function} cb Callback function
 */
const getEventDiff = (events, cb) => {
  fs.exists(STORED_EVENTS_PATH, (exists) => {
    if (!exists) {
      // If the file doesn't exist, likely first time setup. Don't return a diff
      fs.writeFileSync(STORED_EVENTS_PATH, JSON.stringify(events));
      return cb({ removedEvents: [], addedEvents: [] });
    } else {
      const storedEvents = JSON.parse(fs.readFileSync(STORED_EVENTS_PATH));
      // All added events are newly found events that do not exist
      // in the stored events array
      let addedEvents = events.filter(
        event => getEventById(storedEvents, event.id).length === 0
      );
      // Removed events are already stored events that do not exist
      // in the newly found events array
      let removedEvents = storedEvents.filter(
        event => getEventById(events, event.id).length === 0
      );
      return cb({ removedEvents, addedEvents });
    }
  });
};

/**
 * Sets the interval to check for all upcoming events, find the difference
 * between that and the locally stored events, and posts the diff to the
 * updateChannelId in the config
 * @param {Discord Client} bot Discord client.
 */
const createUpdateInterval = (bot) => {
  setInterval(() => {
    authorize(JSON.parse(creds), (auth) => {
      getAllUpcomingEvents(auth, (err, events) => {
        if (err) return console.log('An error has occured in the api', err);
        getEventDiff(events, ({ removedEvents, addedEvents }) => {
          if (removedEvents.length > 0 || addedEvents.length > 0) {
            fs.writeFileSync(STORED_EVENTS_PATH, JSON.stringify(events));
            if (removedEvents.length > 0) {
              let removedMessage = '';
              removedEvents.map((event) => {
                let start = event.start.dateTime || event.start.date;
                start = formatDateString(new Date(start));
                removedMessage += `${start} - ${event.summary}\n`;
              });
              bot.channels.get(config.calendar.updateChannelId)
                .send(makeEmbedNoUser(removedMessage,
                  'Events Removed:'));
            }
            if (addedEvents.length > 0) {
              let addedMessage = '';
              addedEvents.map((event) => {
                let start = event.start.dateTime || event.start.date;
                start = formatDateString(new Date(start));
                addedMessage += `${start} - ${event.summary}\n`;
              });
              bot.channels.get(config.calendar.updateChannelId)
                .send(makeEmbedNoUser(addedMessage,
                  'Events Added:'));
            }
          }
        });
        events.map((event) => {
          const start = event.start.dateTime || event.start.date;
          const eventTime = new Date(start);
          getJson({
            path: REMIND_ME_PATH,
            key: event.id,
            cb: (value) => {
              if (value) {
                const userIds = Object.keys(value);
                userIds.map((userId) => {
                  const reminderTimes = value[userId];
                  reminderTimes.map((reminder, i) => {
                    const today = new Date();
                    const diffMs = eventTime - today;
                    // Diff in minutes
                    const diffMins = Math.round(diffMs / 60000);
                    // If we need to trigger a reminder
                    if (diffMins <= reminder) {
                      let data = JSON.parse(fs.readFileSync(REMIND_ME_PATH));
                      data[event.id][userId].splice(i, 1);
                      fs.writeFileSync(REMIND_ME_PATH, JSON.stringify(data));
                      bot.fetchUser(userId).then((user) => {
                        user.send(`${event.summary} is happening in ` +
                          `${diffMins} minutes!`);
                      }).catch((err) => console.log(err));
                    }
                  });
                });
              }
            },
          });
        });
      });
    });
  }, UPDATE_FREQUENCY);
};

const addReminder = (auth, message) => {
  const calendar = google.calendar({ version: 'v3', auth });
  const index = parseInt(message.content.split(' ')[1], 10);
  const minutes = parseInt(message.content.split(' ')[2], 10);
  if (isNaN(index) || isNaN(minutes)) {
    message.channel.send(REMIND_ME_USAGE);
    return;
  } else if (index < 0) {
    message.channel.send('Could not find event at index ' + index);
    return;
  } else if (minutes < 0) {
    message.channel.send('Minutes has to be a positive number');
    return;
  }
  calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, resp) => {
    if (err) return console.log(err);
    if ((index - 1) > resp.data.items.length) {
      message.channel.send('Could not find event at index ' + index);
      return;
    }
    const event = resp.data.items[index - 1];
    const eventId = event.id;
    const userId = message.author.id;
    addJson({
      path: REMIND_ME_PATH,
      key: `${eventId}.${userId}`,
      value: minutes,
      cb: () => {
        message.channel.send(`Set up a reminder for ${minutes} minutes` +
          ` before ${event.summary}`);
      },
    });
  });
};

const getReminder = (auth, message) => {
  const calendar = google.calendar({ version: 'v3', auth });
  getJson({
    path: REMIND_ME_PATH,
    cb: (allReminders) => {
      if (!allReminders) {
        message.channel.send('No reminders found!');
        return;
      }
      const allEvents = Object.keys(allReminders);
      let userEvents = {};
      for (let i = 0; i < allEvents.length; i++) {
        const allUsers = Object.keys(allReminders[allEvents[i]]);
        for (let j = 0; j < allUsers.length; j++) {
          const userId = allUsers[j];
          if (userId === message.author.id) {
            /**
             * What we're doing here is basically turning this json:
             * { eventId1: {userId1: [time1, time2, time3], userId2: [time1]}
             *}
             * to this json:
             * { eventId1: [time1, time2, time3], eventId2: [time1, time2] }
             */
            userEvents[allEvents[i]] = allReminders[allEvents[i]][userId];
            break;
          }
        }
      }
      const events = Object.keys(userEvents);
      if (events.length === 0) {
        message.channel.send('No reminders found!');
      } else {
        let finalMessage = 'Found reminders for:\n```\n';
        const promises = events.map((eventId) =>
          new Promise((resolve, reject) => {
            calendar.events.get({
              calendarId: 'primary',
              eventId,
            }, (err, resp) => {
              if (err) return reject(err);
              return resolve(resp.data);
            });
          }));
        Promise.all(promises).then((results) => {
          results.map((event) => {
            let eventReminders = `${event.summary}:\n`;
            const reminders = userEvents[event.id];
            reminders.map((reminder) => {
              eventReminders += `\t${reminder} minutes before\n`;
            });
            finalMessage += eventReminders;
          });
          finalMessage += '```';
          message.channel.send(finalMessage);
        });
      }
    },
  });
};

const clearReminder = (auth, message) => {
  const calendar = google.calendar({ version: 'v3', auth });
  const userId = message.author.id;
  const index = parseInt(message.content.split(' ')[1], 10);
  if (isNaN(index)) {
    message.channel.send(CLEAR_REMINDER_USAGE);
    return;
  }
  calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, resp) => {
    if (err) return console.log(err);
    const event = resp.data.items[index - 1];
    const eventId = event.id;
    getJson({
      path: REMIND_ME_PATH,
      key: `${eventId}.${userId}`,
      cb: (value) => {
        if (value) {
          let data = JSON.parse(fs.readFileSync(REMIND_ME_PATH));
          delete data[eventId][userId];
          fs.writeFileSync(REMIND_ME_PATH, JSON.stringify(data));
          message.channel.send(`Cleared all reminders for ${event.summary}`);
        } else {
          message.channel.send(`No reminders found for ${event.summary}`);
        }
      },
    });
  });
};

const getCredsAndAuth = (cb) => {
  if (creds && !(creds instanceof Error)) {
    authorize(JSON.parse(creds), (auth) => cb(auth));
  } else if (creds instanceof Error) {
    console.log('Error reading credentials: ' + creds);
  }
};

const onText = (message, bot) => {
  if (config.googleAPIEnabled) {
    if (message.content.split(' ')[0] === '!events') {
      getCredsAndAuth((auth) => listEvents(auth, message));
    } else if (message.content.split(' ')[0] === '!remindMe') {
      getCredsAndAuth((auth) => addReminder(auth, message));
    } else if (message.content.split(' ')[0] === '!reminders') {
      getCredsAndAuth((auth) => getReminder(auth, message));
    } else if (message.content.split(' ')[0] === '!clearReminders') {
      getCredsAndAuth((auth) => clearReminder(auth, message));
    }
  }
};

module.exports = {
  onText,
  createUpdateInterval,
};
