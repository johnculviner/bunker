app.controller('LobbyController', function ($state, bunkerData, rooms) {

	this.rooms = bunkerData.rooms;

	this.joinRoom = function (roomGuid) {
		rooms.join(roomGuid).then(function (room) {
			$state.go('room', {roomId: room.id});
		});
	};

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

app.filter('connected', function() {
	return function(members) {
		return _(members).pluck('user').select({connected: true}).value();
	};
});
