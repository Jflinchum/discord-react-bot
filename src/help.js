'use strict';

exports.help = (message) => {
  message.channel.send(`\`\`\`
    !add [<url>] <name> --  Adds the file to the local storage
                            under the name given. If uploading
                            an attachment, the url is not
                            needed.
    !post <name> [<vc>] --  Posts the file to the current
                            channel. If the file is an mp3 and
                            a voice channel is given, the bot
                            will play the mp3 into the
                            voice channel.
    !remove <name>      --  Deletes the file and from the local
                            storage.
    !list               --  Lists all files currently saved in
                            the local storage.
    !help               --  Displays this help screen!
  \`\`\``);
};
