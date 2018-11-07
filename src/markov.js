'use strict';
const MarkovChain = require('markovchain');
const fs = require('fs');

var markovString = "";
var channelLength = 0;
var channelsDone = 0;

var intros = [" says things like this: ", " might say this: ", "'s catchphrase is: ", " frequently tells me: ", " likes to say: ", " says: "];

exports.markov = (user, guild, origChannel) => {
	markovString = "";
	guild.channels.tap(channel => {
		if (channel.type == "text")
		{
			channelLength++;
			channel.fetchMessages()
				.then(messages => exports.asyncMarkov(user, messages.filter(m => m.author.id === user.id), origChannel))
				.catch(console.error);
		}
	});
};

exports.asyncMarkov = (user, messages, origChannel) => {
	messages.tap(message => markovString += (message.content + "\n"));
	
	channelsDone++;
	if (channelsDone == channelLength)
	{
		exports.postMarkov(user, origChannel);
	}
};

exports.postMarkov = (user, origChannel) => {
	channelsDone = 0;
	channelLength = 0;
	
	var markovGen = new MarkovChain(markovString);

	var getAll = function(wordList) {
		return Object.keys(wordList)[~~(Math.random()*Object.keys(wordList).length)]
	}
	
	origChannel.send(user.username + intros[Math.floor(Math.random()*intros.length)] + "\"*" + markovGen.start(getAll).end().process() + "*\"");
};