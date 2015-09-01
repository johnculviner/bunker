app.directive('inputBox', function ($rootScope, emoticons, bunkerData, fuzzyByFilter) {

	return {
		scope: {},
		templateUrl: '/assets/app/input/inputBox.html',
		link: link
	};

	function link(scope, elem) {
		var menuButton = elem.find('.dropdown-toggle');
		var menu = elem.find('.dropdown');
		var textArea = elem.find('textarea');
		var listener = new window.keypress.Listener(elem);
		$('textarea', elem).keyup(keyUp)

		var commands = [
			{command: 'test', label: 'har har'},
			{command: 'derp', label: 'welp'}
		];

		scope.mentionUser = function (userNick) {
			$rootScope.$broadcast('inputText', '@' + userNick);
		};

		function keyUp(evt) {
			// only check numbers and letters for this func
			//if (evt.which < 48 || evt.which > 90) return;

			//if (!searching) return;

			var inputMessage = textArea.val();
			var systemCommand = /^\/(\w*)$/ig.exec(inputMessage);
			console.log('match', systemCommand);
			if (systemCommand) {
				return update(commands, 'command', systemCommand[1]);
			}

			var mention = /@([\w\s\-\.]{0,19})/ig.exec(inputMessage);
			if (mention) {
				var memberList = bunkerData.getRoom($rootScope.roomId).$memberList;
				var users = _.map(memberList, 'user');
				return update(users, 'nick', mention[1]);
			}

			var emoticon = /:(.*)/ig.exec(inputMessage);
			if(emoticon) {
				return update(emoticons.list, 'name', emoticon[1]);
			}

			update();
		}

		/* setup special key combos */
		//listener.simple_combo("/", function (a,b,c) {
		//	console.log(a,b,c)
		//	menuButton.dropdown('toggle');
		//	searching = true;
		//	return true;
		//});

		//listener.simple_combo("backspace", function () {
		//	if (searchTerm.length) {
		//		//TODO: is there a lodash thing to chop off the last letter?
		//		searchTerm = searchTerm.slice(0, searchTerm.length - 1);
		//	}
		//	else { // assuming we are backspacing over the search trigger (ex: / )
		//		searching = false;
		//	}
		//
		//	update();
		//	return true;
		//});

		function update(list, searchProperty, searchTerm) {
			if (!list) {
				return menuClose();
			}

			menuOpen();

			console.log('searchTerm', searchTerm);
			scope.list = searchProperty;
			scope.commands = fuzzyByFilter(list, searchProperty, searchTerm);
			scope.$digest();
		}

		function menuOpen() {
			if (menu.hasClass('open')) return;
			menuButton.dropdown('toggle');
		}

		function menuClose() {
			if (!menu.hasClass('open')) return;
			menuButton.dropdown('toggle');
		}
	}
});


//app.directive('inputBox', function ($rootScope, $stateParams, emoticons, bunkerData) {
//
//	var messageEditWindowSeconds = 60;
//
//	var searchStates = {
//		NONE: 'none',
//		EMOTE: 'emote',
//		NICK: 'nick'
//	};
//
//	return {
//		scope: true,
//		templateUrl: '/assets/app/input/inputBox.html',
//		link: function (scope, elem) {
//			var searchState = searchStates.NONE;
//			var emoticonSearch = '';
//			var emoticonSearchIndex = -1;
//			var nickSearch = '';
//			var nickSearchIndex = -1;
//
//			scope.$stateParams = $stateParams;
//			scope.messageText = '';
//			scope.submittedMessages = [];
//			scope.selectedMessageIndex = -1;
//
//			var previousText = null;
//			scope.editMode = false;
//
//			// bind our keyup/down funcs to input box.
//			$('textarea', elem)
//				.keydown(keyDown)
//				.keyup(keyUp);
//
//			scope.sendMessage = function () {
//				if (!scope.messageText) return;
//
//				var newMessage = {
//					room: $rootScope.roomId,
//					text: scope.messageText
//				};
//
//				var chosenMessage = scope.selectedMessageIndex > -1 ? scope.submittedMessages[scope.selectedMessageIndex] : {createdAt: null};
//				var historicMessage = {text: scope.messageText, createdAt: Date.now(), history: ''};
//
//				if(scope.messageText.replace(/\s/g, '').length == 0) {
//					// Nothing to do! (but still reset things)
//				}
//				else if (!scope.editMode) {
//
//					bunkerData.createMessage(newMessage.room, newMessage.text)
//						.then(function (result) {
//							if (result && result.author) {
//								historicMessage.id = result.id;
//								scope.submittedMessages.unshift(historicMessage); // Save message for up/down keys to retrieve
//							}
//						});
//				}
//				else {
//					scope.submittedMessages[scope.selectedMessageIndex].text = scope.messageText;
//					newMessage.id = scope.submittedMessages[scope.selectedMessageIndex].id;
//					newMessage.edited = true;
//					chosenMessage.edited = true;
//					bunkerData.editMessage(newMessage);
//				}
//
//				// Reset all the things
//				scope.selectedMessageIndex = -1;
//				scope.messageText = '';
//				scope.editMode = false;
//				previousText = null;
//				emoticonSearch = '';
//				emoticonSearchIndex = -1;
//			};
//
//			function keyDown(evt) {
//				if (evt.keyCode == 13) {
//					evt.preventDefault();
//					if(evt.shiftKey && bunkerData.userSettings.multilineShiftEnter) {
//						scope.messageText = scope.messageText + '\n';
//					}
//					else {
//						scope.sendMessage();
//					}
//					scope.$digest();
//				}
//				else if (evt.keyCode == 9) { // tab
//					evt.preventDefault(); // prevent tabbing out of the text input
//
//					if (searchState === searchStates.EMOTE) { // if we're in a search
//
//						var matchingEmoticons = _.filter(emoticons.names, function (emoticon) {
//							return emoticon.indexOf(emoticonSearch) == 0
//						});
//
//						if (matchingEmoticons.length == 0) return; // no matches, nothing to do
//
//						if (evt.shiftKey) { // shift modifier goes backwards through the matches
//							emoticonSearchIndex = emoticonSearchIndex > 0
//								? Math.max(emoticonSearchIndex - 1, 0)
//								: matchingEmoticons.length - 1;
//						}
//						else { // cycle
//							emoticonSearchIndex = emoticonSearchIndex < matchingEmoticons.length - 1
//								? Math.min(emoticonSearchIndex + 1, matchingEmoticons.length - 1)
//								: 0;
//						}
//
//						// Replace the last emoticon text with a match
//						scope.messageText = scope.messageText.replace(/:\w+:?$/, ':' + matchingEmoticons[emoticonSearchIndex] + ':');
//						scope.$digest();
//					}
//					else if (searchState === searchStates.NICK) {
//						var currentRoom = bunkerData.getRoom($rootScope.roomId);
//						var users = _.pluck(currentRoom.$members, 'user');
//						var matchingNames = _.filter(users, function (item) {
//							return item.nick.toLowerCase().slice(0, nickSearch.toLowerCase().length) === nickSearch.toLowerCase();
//						});
//
//						if (matchingNames.length == 0) return;
//
//						if (evt.shiftKey) { // shift modifier goes backwards through the matches
//							nickSearchIndex = nickSearchIndex > 0
//								? Math.max(nickSearchIndex - 1, 0)
//								: matchingNames.length - 1;
//						}
//						else { // cycle
//							nickSearchIndex = nickSearchIndex < matchingNames.length - 1
//								? Math.min(nickSearchIndex + 1, matchingNames.length - 1)
//								: 0;
//						}
//
//						if (/^\/f(?:ight)?(?:\s(\w)?|$)/i.test(scope.messageText)) {
//							scope.messageText = scope.messageText.replace(/[//\w ]*?$/, '/f ' + matchingNames[nickSearchIndex].nick + ' ');
//						} else {
//							scope.messageText = scope.messageText.replace(/@[\w ]*?$/, '@' + matchingNames[nickSearchIndex].nick + ' ');
//						}
//						scope.$digest();
//					}
//				}
//			}
//
//			function keyUp(evt) {
//				if (evt.keyCode == 38 || evt.keyCode == 40) {// choose previous message to edit
//					scope.selectedMessageIndex += evt.keyCode == 38 ? 1 : -1;
//
//					if (scope.selectedMessageIndex < 0) {
//						scope.selectedMessageIndex = 0;
//					}
//					else if (scope.selectedMessageIndex >= scope.submittedMessages.length) {
//						scope.selectedMessageIndex = scope.submittedMessages.length - 1;
//					}
//
//					var chosenMessage = scope.submittedMessages[scope.selectedMessageIndex];
//					previousText = chosenMessage.text;
//
//					scope.messageText = chosenMessage.text;
//					scope.editMode = true;
//
//					scope.$digest();
//				}
//				else if (evt.keyCode == 27) { // 'escape'
//					// Reset all the things
//					scope.selectedMessageIndex = -1;
//					scope.messageText = '';
//					scope.editMode = false;
//					previousText = null;
//					emoticonSearch = '';
//					emoticonSearchIndex = -1;
//					scope.$digest();
//				}
//				else if (evt.keyCode != 9 && evt.keyCode != 16) {
//					if (/:\w+$/.test(scope.messageText)) {
//						searchState = searchStates.EMOTE;
//						// if an emoticon is at the end of the message, start the search
//						emoticonSearch = scope.messageText.match(/:(\w+)$/)[1];
//						emoticonSearchIndex = -1;
//					}
//					else if (/@|(\/f(?:ight)?\s)\w*$/.test(scope.messageText)) {
//						if (scope.messageText.match(/^\/f(?:ight)?(?:\s(\w*)|$)/)) {
//							nickSearch = scope.messageText.match(/^\/f(?:ight)?(?:\s(\w*)|$)/)[1];
//						} else if (scope.messageText.match(/@(\w*)$/)) {
//							nickSearch = scope.messageText.match(/@(\w*)$/)[1];
//						}
//						searchState = searchStates.NICK;
//						nickSearchIndex = -1;
//					}
//					else {
//						searchState = searchStates.NONE;
//					}
//				}
//			}
//
//			function datesWithinSeconds(date1, seconds) {
//				var elapsed = Math.abs(date1 - Date.now()) / 1000;
//				return elapsed < seconds;
//			}
//		}
//	};
//});
