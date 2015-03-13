/* global User, Room, _, actionUtil, require */

/**
 * RoomController
 *
 * @description :: Server-side logic for managing rooms
 * @help        :: See http://links.sailsjs.org/docs/controllers
 */

'use strict';

var moment = require('moment');
var ent = require('ent');
var actionUtil = require('../../node_modules/sails/lib/hooks/blueprints/actionUtil');
var ObjectId = require('mongodb').ObjectID;

// GET /room/:id
// Overridden from sails blueprint to disable subscribing
module.exports.findOne = function (req, res) {
	var pk = actionUtil.requirePk(req);
	Room.findOne(pk).populateAll().exec(function found(err, matchingRecord) {
		if (err) return res.serverError(err);
		if (!matchingRecord) return res.notFound('No record found with the specified `id`.');
		res.ok(matchingRecord);
	});
};


// POST /room
// Create a room
module.exports.create = function (req, res) {
	var userId = req.session.userId;
	var name = req.param('name') || 'Untitled';

	// Create new instance of model using data from params
	Room.create({name: name}).exec(function (err, room) {

		// Make user an administrator
		RoomMember.create({room: room.id, user: userId, role: 'owner'}).exec(function (error, roomMember) {
			RoomMember.publishCreate(roomMember);

			// WARNING
			// Do not publishCreate of this room, it will go to all users who's client will then join it

			res.status(201);
			res.ok(room.toJSON());
		});
	});
};

exports.message = function (req, res) {

	var roomId = actionUtil.requirePk(req);

	// block the trolls
	var text = ent.encode(req.param('text'));
	if (!text || !text.length) {
		return res.badRequest();
	}

	User.findOne(req.session.userId)
		.then(function (user) {

			// TODO if author is not a member of the roomId, cancel

			if (/^\/nick\s+/i.test(text)) { // Change the current user's nick

				var newNick = text.match(/\/nick\s+([\w\s\-\.]{1,20})/i);
				if (newNick) {
					var currentNick = user.nick;
					user.nick = newNick[1];
					user.save() // save the model with the updated nick
						.then(function () {
							User.publishUpdate(user.id, {nick: user.nick});

							RoomMember.find().where({user: user.id}).exec(function (err, roomMembers) {
								var rooms = _.pluck(roomMembers, 'room');
								RoomService.messageRooms(rooms, currentNick + ' changed their handle to ' + user.nick);
							});
						})
						.catch(function () {
							// TODO error handling
						});
				}
			}
			else if (/^\/topic/i.test(text)) { // Change room topic

				RoomMember.findOne({room: roomId, user: user.id}).populate('user').exec(function (error, roomMember) {
					if (error) return res.serverError(error);
					if (!roomMember) return res.forbidden();

					if (roomMember.role == 'administrator' || roomMember.role == 'owner') {

						var topicMatches = text.match(/\/topic\s+(.+)/i);
						var topic = topicMatches ? topicMatches[1].substr(0, 200) : null;

						Room.update(roomId, {topic: topic}).exec(function (error, room) {
							if (error) return res.serverError(error);
							if (!room) return res.notFound();

							room = room[0];
							var message = roomMember.user.nick + (topic ? ' changed the topic to "' + topic + '"' : ' cleared the topic');

							Room.publishUpdate(room.id, room);
							RoomService.messageRoom(roomId, message);
						});
					}
					else {
						res.forbidden();
					}
				});
			}
			else if (/^\/me\s+/i.test(text)) {
				return Message.create({
					room: roomId,
					author: null,
					text: user.nick + text.substring(3)
				}).then(broadcastMessage);
			}
			else {

				// base case, a regular chat message
				// Create a message model object in the db

				return Message.create({
					room: roomId,
					author: user.id,
					text: text
				}).then(broadcastMessage);
			}
		})
		.then(res.ok)
		.catch(res.serverError);
};


// GET /room/:id/join
// Join a room
module.exports.join = function (req, res) {
	var pk = actionUtil.requirePk(req);
	var userId = req.session.userId;

	Room.findOne(pk).exec(function (err, room) {
		if (err) return res.serverError(err);
		if (!room) return res.notFound();

		res.ok(room); // Can return the room info immediately; perform the subscriptions asynchronously below

		// Subscribe the socket to message and updates of this room
		// Socket will now receive messages when a new message is created
		Room.subscribe(req, room, ['message', 'update']);
		RoomMember.watch(req); // TODO probably an information leak but ARS can't update without it

		RoomMember.find().where({room: pk})
			.then(function (roomMembers) {
				if (_.find(roomMembers, {user: userId})) { // Do we need to add as a member?
					return roomMembers;
				}

				return RoomMember.create({room: pk, user: userId}).then(function (roomMember) {
					RoomMember.publishCreate(roomMember);

					// Create system message to inform other users of this user joining
					User.findOne(userId).then(function (user) {
						RoomService.messageRoom(pk, user.nick + ' has joined the room');
					});
					return roomMembers;
				});
			})
			.then(function (roomMembers) {
				// Subscribe the new user to every existing user
				_.each(roomMembers, function (member) {
					User.subscribe(req, member.user, ['message', 'update']);
				});

				// Subscribe all of the existing subscribers to this new user
				_.each(Room.subscribers(pk, 'update'), function (subscriber) {
					User.subscribe(subscriber, userId, ['message', 'update']);
				});
			})
			.catch(res.serverError);
	});
};

// PUT /room/:id/leave
// Current user requesting to leave a room
module.exports.leave = function (req, res) {
	var pk = actionUtil.requirePk(req);
	var userId = req.session.userId;

	Room.findOne(pk).exec(function (error, room) {
		if (error) return res.serverError();
		if (!room) return res.notFound();

		res.ok(room);

		// Unsubscribe socket from this room
		Room.unsubscribe(req, room, ['message', 'update']);
		// TODO unsubscribe all members? probably not... need to figure out which ones

		// Remove room membership
		RoomMember.destroy({room: pk, user: userId}).exec(function (err, destroyedRecords) {
			_.each(destroyedRecords, function (destroyed) {
				RoomMember.publishDestroy(destroyed.id);
				RoomMember.retire(destroyed);

				// Create system message to inform other users of this user leaving
				User.findOne(userId).exec(function (err, user) {
					if (err) return res.serverError(err);
					RoomService.messageRoom(pk, user.nick + ' has left the room');
				});
			});
		});
	});
};

// GET /room/:id/messages
// Get the messages of a room, with optional skip amount
module.exports.messages = function (req, res) {
	var roomId = actionUtil.requirePk(req);
	var skip = req.param('skip') || 0;
	// TODO check for roomId and user values

	// find finds multiple instances of a model, using the where criteria (in this case the roomId
	// we also want to sort in DESCing (latest) order and limit to 50
	// populateAll hydrates all of the associations
	Message.find().where({room: roomId}).sort('createdAt DESC').skip(skip).limit(50).populateAll()
		.then(res.ok)
		.catch(res.serverError);
};

// GET /room/:id/history
// Get historical messages of a room
module.exports.history = function (req, res) {
	var roomId = actionUtil.requirePk(req);
	var startDate = req.param('startDate');
	var endDate = req.param('endDate');

	Message.find({room: roomId, createdAt: {'>': new Date(startDate), '<': new Date(endDate)}})
		.populate('author')
		.then(res.ok)
		.catch(res.serverError);
};

// GET /room/:id/media
// Get media messages posted in this room
module.exports.media = function (req, res) {
	var roomId = actionUtil.requirePk(req);
	var mediaRegex = /https?:\/\//gi;

	// Native mongo query so we can use a regex
	Message.native(function (err, messageCollection) {
		if (err) res.serverError(err);

		messageCollection.find({
			room: ObjectId(roomId),
			text: {$regex: mediaRegex}
		}).sort({createdAt: -1}).toArray(function (err, messages) {
			if (err) res.serverError(err);

			res.ok(_.map(messages, function (message) {
				return _(message)
					.pick(['author', 'text', 'createdAt'])
					.extend({id: message._id})
					.value();
			}));
		});
	});
};

function broadcastMessage(message) {
	// now that message has been created, get the populated version
	Message.findOne(message.id).populateAll().then(function (message) {
		Room.message(message.room, message); // message all subscribers of the room that with the new message as data
	});
	return message;
}
