# discord-react-bot
A react bot for discord that can download and store files locally and post them based on the trigger words given to them.

## Features
* Stores and posts any type of file (pdf, png, zip, etc.)
* Posts the contents of a text file with text to speech
* Plays music files or youtube videos to a channel
* Queues up multiple songs to play to multiple channels
* Generates a markov chain message based off of a user's message history
* Attempts voice recognition using Wit.AI

## How to run
* Install dependencies with `npm install`
  * Some other dependencies may need to be installed on your machine manually. Check [node-gyp](https://github.com/nodejs/node-gyp) and [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg).
* Make sure that your Discord bot token and Wit.AI token (only required for voice recognition) is set in `settings.json`
* Use `npm start` to launch the bot

## Voice recognition
* As a part of voice recognition, bot sound effects are required for affirming commands and joining channels please be sure to have a:
  * botSounds folder at the root directory
  * botSounds/channelJoin folder filled with any sound clips you want to be played when joining a channel
  * botSounds/affirm folder filled with any affirmation clips to be played


## Current commands
```
[!add/!a] [<url>/"Example String Here"] <name> [<startTimeStamp>] [<stopTimeStamp>]
- Adds the file to the local storage under the name given. If uploading an attachment, the url is not needed. Supports youtube urls for downloading mp3 files. To upload a string into a text file, wrap the string in quotation marks. Timestamps must be in seconds and only work for mp3/wav files.

[!post/!p] <name>
- Posts the file to the current channel.

[!remove/!r] <name>
- Deletes the file from the local storage.

[!list/!l][image/music/text]
- Lists all files currently saved in the local storage. If a file type is requested, it will only list files under that type.

[!skip/!s][<index>]
- Skips the current song if no index is given. Skips the song listed in the queue at the index otherwise.

!markov <@user/#textChannel/all> [messageStart]
- Generates a message based off of a user or channel's history. You can specify a phrase the message will start with.

[!rename/!rn] <oldName> <newName>
- Renames a file from the old name to the new name.

!append <name> <"Example Text">
- Appends text to the end of a text file. Only works for .txt files.

[!play/!pl] [<name>] <voiceChannel>/.
- Plays an audio file to the specified channel. Name can be a name of a local file or a youtube video. If uploading an attachment, the name is not needed. Supplying a . as the channel name will make the bot use the channel with any users with it.

!trigger <emoji> <decimalChance> <"Example Text">
- Makes the bot react to the message with the supplied emoji. The decimal chance (between 0 and 1) is how often the bot will react.

!listen <voiceChannel>/.
- Listens in on a voice channel and attempts voice recognition to do commands
- Current listen commands are "play <media name>", "search <youtube media>", and "leave"

!leave
- Leaves any voice channels that the bot is listening in on

[!help/!h]
- Displays this help screen!
```
