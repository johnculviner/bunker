app.controller('LobbyController', function ($state, bunkerApi, user) {
	var self = this;

	user.memberships.$promise.then(function(memberships) {
		self.rooms = [];
		// Get all known rooms and populate with member counts

		_(memberships).pluck('room').each(function(room) {
			bunkerApi.roomMember.query({room: room.id}, function(roomMembers) {
				room.$memberCount = roomMembers.length;
				room.$onlineMemberCount = _.filter(roomMembers, function(roomMember) { return roomMember.user.connected; }).length;
				self.rooms.push(room);
			});
		});
	});

	this.createRoom = function (roomName) {
		var newRoom = new bunkerApi.room({name: roomName});
		newRoom.$save(
			function (room) {
				$state.go('room', {roomId: room.id});
			},
			function (error) {
				// TODO show error
			});
	};
});
