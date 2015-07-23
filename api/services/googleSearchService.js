var Promise = require('bluebird');
var request = Promise.promisifyAll(require('request'));

var googleSearchService = module.exports;

googleSearchService.imageSearch = function (query) {
	console.log('image search');

	// supposedly this API was turned off a year ago but still seems to work :shrug:
	// there is a new API with a 100 / day limit but I couldn't get it working :fistshake:
	// notes for new api
	return request.getAsync({
		json: true,
		url: 'https://ajax.googleapis.com/ajax/services/search/images',
		qs: {
			v: '1.0',
			rsz: 8,
			safe: 'active',
			q: query
		}
	})
		.spread(function (response, body) {
			return body.responseData.results;
		})
		.map(function (image) {
			return image.unescapedUrl;
		});
};

googleSearchService.oneImage = function (query) {
	return googleSearchService.imageSearch(query)
		.then(function (images) {
			return _.sample(images);
		});
};

googleSearchService.gifSearch = function (query) {
	console.log('gif search');

	return request.getAsync({
		json: true,
		url: 'https://ajax.googleapis.com/ajax/services/search/images',
		qs: {
			v: '1.0',
			rsz: 8,
			safe: 'active',
			imgType: 'animated',
			q: query
		}
	})
		.spread(function (response, body) {
			return body.responseData.results;
		})
		.map(function (image) {
			return image.unescapedUrl;
		});
};

googleSearchService.oneGif = function (query) {
	return googleSearchService.gifSearch(query)
		.filter(function (image) {
			if (image.indexOf('giphy') > -1) return false;
			if (image.indexOf('ytimg') > -1) return false;
			if (image.indexOf('gifsec') > -1) return false;
			if (image.indexOf('photobucket') > -1) return false;
			if (image.indexOf('replygif') > -1) return false;
			if (image.indexOf('gifrific') > -1) return false;
			if (image.indexOf('.jpg') > -1) return false;
			if (image.indexOf('.jpeg') > -1) return false;
			if (image.indexOf('.png') > -1) return false;
			return true;
		})
		.then(function (images) {
			return _.sample(images);
		});
};