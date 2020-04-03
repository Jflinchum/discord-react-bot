'use strict';
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const { config, makeEmbedNoUser, formatDateString } = require('./../util');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';
const STORED_EVENTS_PATH = 'events.json';
// Frequency in milliseconds to check for updates to the calendar
const UPDATE_FREQUENCY = 60 * 1000;
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
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth, message) {
  const calendar = google.calendar({ version: 'v3', auth });
  const params = message.content.split(' ');
  let timeMin = new Date();
  // Time max is set to one week out
  if (params.length > 1) {
    if (!isNaN(new Date(params[1]))) {
      timeMin = new Date(params[1]);
    }
  }
  let timeMax = new Date(timeMin.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (params.length > 2) {
    if (!isNaN(new Date(params[2]))) {
      timeMax = new Date(params[2]);
    }
  }
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
    if (events.length) {
      events.map((event, i) => {
        let start = event.start.dateTime || event.start.date;
        start = formatDateString(new Date(start));
        finalMessage += `${start} - ${event.summary}\n`;
      });
    } else {
      finalMessage += 'No upcoming events found.';
    }
    message.channel.send(makeEmbedNoUser(finalMessage,
      `Upcoming Events: (${formatDateString(timeMin).split(',')[0]}) - ` +
      `(${formatDateString(timeMax).split(',')[0]})` +
      `\n${config.timeZone}`));
  });
}

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

const getEventById = (events, id) => {
  return events.filter(event => event.id === id);
};

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

const createUpdateInterval = (bot) => {
  setInterval(() => {
    authorize(JSON.parse(creds), (auth) => {
      getAllUpcomingEvents(auth, (err, events) => {
        if (err) return console.log('An error has occured in the api', err);
        console.log('CHECKING FOR EVENTS');
        getEventDiff(events, ({ removedEvents, addedEvents }) => {
          console.log('REMOVED EVENTS', removedEvents);
          console.log('ADDED EVENTS', addedEvents);
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
      });
    });
  }, UPDATE_FREQUENCY);
};

const onText = (message, bot) => {
  if (config.googleAPIEnabled &&
      message.content.split(' ')[0] === '!events') {
    if (creds && !(creds instanceof Error)) {
      authorize(JSON.parse(creds), (auth) => listEvents(auth, message));
    } else if (creds instanceof Error) {
      console.log('Error reading credentials: ' + creds);
    }
  }
};

module.exports = {
  onText,
  createUpdateInterval,
};
