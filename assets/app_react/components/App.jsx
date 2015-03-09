/** @jsx React.DOM */

var MembershipStore = require('../user/membershipStore');
var UserStore = require('../user/userStore');

var Header = require('./Header.jsx');
var Lobby = require('./Lobby.jsx');

module.exports = React.createClass({

	render: function () {
		return (
			<div>
				<Header />
				<Lobby />
			</div>
		);
	}
});