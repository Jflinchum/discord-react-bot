# discord-react-bot
A react bot for discord that can download and store files locally and post them based on the trigger words given to them.

## Features
* Stores and posts any type of file (pdf, png, zip, etc.)
* Posts the contents of a text file with text to speech
* Plays music files or youtube videos to a channel
* Queues up multiple songs to play to multiple channels
* Generates a markov chain message based off of a user's message history

## How to run
* Install dependencies with `npm install`
  * Some other dependencies may need to be installed on your machine manually. Check [node-gyp](https://github.com/nodejs/node-gyp) and [fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg).
* Put your bot token under the environment variable DISCORD_TOKEN
* Use `npm start` to launch the bot

## Current commands
```
[!add/!a] [<url>/"Example String Here"] <name>
- Adds the file to the local storage under the name given. If uploading an attachment, the url is not needed. Supports youtube urls for downloading mp3 files. To upload a string into a text file, wrap the string in quotation marks.

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

[!play/!pl] [<name>] <voiceChannel>
- Plays an audio file to the specified channel. Name can be a name of a local file or a youtube video. If uploading an attachment, the name is not needed.

[!help/!h]
- Displays this help screen!
```
