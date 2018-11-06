'use strict';

exports.help = (message) => {
  message.channel.send(`\`\`\`
    !add [<url>] <name> --  Adds the file to the local storage
                            under the name given. If uploading
                            an attachment, the url is not
                            needed. Supports youtube urls
                            for downloading mp3 files.

    !post <name> [<vc>] --  Posts the file to the current
                            channel. If the file is an mp3 and
                            a voice channel is given, the bot
                            will play the mp3 into the
                            voice channel.

    !remove <name>      --  Deletes the file from the local
                            storage.

    !list [image/music/text]
                        --  Lists all files currently saved in
                            the local storage. If a file type
                            is requested, it will only list
                            files under that type.

    !leave              --  Leaves any voice channels the bot
                            is currently in.

    !stream <url> <vc>  --  Streams the audio of a youtube
                            video directly to a channel.

    !help               --  Displays this help screen!
  \`\`\``);
};
