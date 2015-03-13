/* global module, require, User, UserSettings, UserService, Message, Room, actionUtil */

/**
 * MessageController
 *
 * @description :: Server-side logic for managing messages
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

'use strict';

var moment = require('moment');
var actionUtil = require('../../node_modules/sails/lib/hooks/blueprints/actionUtil');

// PUT /message/:id
// Update a message (the edit functionality)
exports.update = function (req, res) {
	var messageEditWindowSeconds = 30;
	var pk = actionUtil.requirePk(req);

	Message.findOne(pk).exec(function (error, message) {
		if (error) return res.serverError(error);
		if (!message) return res.notFound();

		// TODO use moment here
		var acceptableEditDate = new Date();
		acceptableEditDate.setSeconds(acceptableEditDate.getSeconds() - messageEditWindowSeconds);
		if (message.createdAt < acceptableEditDate) {
			return;
		}

		var updates = { // Only certain things are editable
			text: req.param('text'),
			history: req.param('history'),
			edited: true
		};

		Message.update(pk, updates).exec(function (error) {
			if (error) return res.serverError(error);
			broadcastMessage(message);
		});
	});
};

// GET /message/emoticons
exports.emoticonCounts = function (req, res) {
	// setting the request url as as the cache key
	cacheService.short.wrap('Message/emoticonCounts', lookup, done);

	function lookup(cacheLoadedCb) {
		var emoticonRegex = /:\w+:/g;
		var countMap = {};

		// .native gives you a callback function with a hook to the model's collection
		Message.native(function (err, messageCollection) {
			if (err) return cacheLoadedCb(err);

			messageCollection.find({text: {$regex: emoticonRegex}}).toArray(function (err, messages) {
				_.each(messages, function (message) {

					var matches = message.text.match(emoticonRegex);
					if (matches) {
						_.each(matches, function (match) {
							countMap[match] = countMap[match] ? countMap[match] + 1 : 1;
						});
					}
				});

				var emoticonCounts = _(countMap).map(function (value, key) {
					return {count: value, emoticon: key, name: key.replace(/:/g, '')};
				}).sortBy('count').reverse().value();

				cacheLoadedCb(err, emoticonCounts);
			});
		});
	}

	function done(err, messages) {
		res.ok(messages)
	}
};

function broadcastMessage(message) {
	// now that message has been created, get the populated version
	Message.findOne(message.id).populateAll().exec(function (error, message) {
		Room.message(message.room, message); // message all subscribers of the room that with the new message as data
	});
}
