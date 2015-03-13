app.factory('bunkerData', function($rootScope, $q) {

	// In the beginning...
	var bunkerData = {
		rooms: [],
		$resolved: false,
		$promise: null // to be created soon
	};

	// Ask the server to setup initial state and send us some starter data
	bunkerData.$promise = $q(function(resolve) {
		io.socket.get('/init', function(initialData) {
			_.each(initialData.rooms, function(room) {
				console.log(room);
				if(!room.messages) room.messages = [];
				bunkerData.rooms.push(room);
			});
			bunkerData.$resolved = true;
			$rootScope.$digest();
			resolve();
		});
	});

	// Handle events
	io.socket.on('room', function(evt) {
		switch(evt.verb) {
			case 'messaged': {
				console.log(evt);
				var room = _.find(bunkerData.rooms, {id: evt.data.room.id});
				if(room) {
					room.messages.push(evt.data);
					$rootScope.$digest();
				}
				break;
			}
		}
	});

	return bunkerData;
});
