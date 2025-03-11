# discord-react-bot
A react bot for discord that can download and store files locally and post them based on the trigger words given to them.

## Features
* Stores and posts any type of file (pdf, png, zip, etc.)
* Posts the contents of a text file with text to speech
* Plays music files or youtube videos to a channel
* Queues up multiple songs to play to multiple channels
* Generates a markov chain message based off of a user's message history

## How to run
#### Docker
* Install Docker
* Run `docker build -t discordbot .`
* Edit the `compose.yaml` file to include the discord token for the bot you've created
* Run `docker compose -f compose.yaml up --watch`

#### Local Machine
* Install dependencies with `npm install`
  * Some other dependencies may need to be installed on your machine manually. Check [node-gyp](https://github.com/nodejs/node-gyp) and [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg).
* Put your bot token under the environment variable DISCORD_TOKEN
* Use `npm start` to launch the bot

## Current commands
```
[!add/!a] [<url>/"Example String Here"] <name> [<startTimeStamp>] [<stopTimeStamp>]
- Adds the file to the local storage under the name given. If uploading an attachment, the url is not needed. Supports youtube urls for downloading mp3 files. To upload a string into a text file, wrap the string in quotation marks. Timestamps must be in seconds and only work for mp3/wav files.

[!post/!p] <name>
- Posts the file to the current channel.

[!remove/!r] "<name>"
- Deletes the file from the local storage.

[!list/!l] [image/music/text/emoji/cron]
- Lists all files currently saved in the local storage. If a file type is requested, it will only list files under that type.

[!skip/!s] [<index>]
- Skips the current song if no index is given. Skips the song listed in the queue at the index otherwise.

!markov <@user/#textChannel/all> [messageStart]
- Generates a message based off of a user or channel's history. You can specify a phrase the message will start with.

[!rename/!rn] <oldName> <newName>
- Renames a file from the old name to the new name.

!append <name> <"Example Text">
- Appends text to the end of a text file. Only works for .txt files.

[!play/!pl] [<name>] [<voiceChannel>/.]
- Plays an audio file to the specified channel. Name can be a name of a local file or a youtube video. If uploading an attachment, the name is not needed. Supplying a . as the channel name will make the bot use the channel with any users with it.

!trigger <emoji> <decimalChance> <"Example Text">
- Makes the bot react to the message with the supplied emoji. The decimal chance (between 0 and 1) is how often the bot will react.

!gpt2 <prompt>
- Makes the bot generate a gpt2 response based on the prompt you give it

!addCron <name> <#channel> <"message"> <cronSyntax>
- Sets a cron job for the bot to automatically post the link to the channel at the given cron time syntax

!removeCron <name>
- Removes the cron job at the given name

!events [<startDate "mm/dd/yyyy">] [<endDate>]
- Shows the current events in for the bot's google calendar. Start date is defaulted to the current time and end date is defaulted to a week from the start date

!reminders
- Shows all of the reminders set up currently for you

!remindMe <n> <minutes>
- Sets up a reminder for the bot to dm you within the amount of minute specified. n is the nth event from now.

!clearReminders <n>
- Clears all reminders that you have set up for the nth event from the current date

!attendance <n>
- Shows all users who have are on the guest list for the nth event from the current date

!set <property> <value>
- Stores the defined value under the property in the user's config file

!config
- Displays what is in your config file

!roll <amount> [d]<sides>
- Rolls the amount of dice with the specified sides

!pat <@person>
- Gives that person a head pat!

!myPats
- Checks how many pats you have

!userGroup
- !userGroup list - lists all currently configured user groups
- !userGroup add "Group Name" [<colorCode>] - creates a role on the server with the Group Name and color code (in hex value i.e FFFFFF for white)
- !userGroup remove "Group Name" - removes the role from the server
- !userGroup sub "Group Name" - adds yourself to the Group Name role
- !userGroup unsub "Group Name" - removes yourself from the Group Name role
- !userGroup rename "Old Group Name" "New Group Name" - renames a user group role to a new name

!changeIcon [<url>/<attachment>]
- Changes the server icon to the image using the url or the attachment. Restricted to admins only

!chart [pats]
- Generates a chart for all pats on the server. Only lists the top 5

[!help/!h]
- Displays this help screen!
```
