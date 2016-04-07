"use strict";
var request = require("request");
module.exports = {
	requireModule : function (path) {  
		return require((process.env.APP_DIR_FOR_CODE_COVERAGE || '../') + path);
	},

	getKey : function(){
		return "9b96ba56ce934ded56c3f21ac9bdaddc8ba4782b7753cf07576bfabcace8632eba1749ff1187239ef1f56dd74377aa1e5d0a1113de2ed18368af4b808ad245bc7da986e101caddb7b75992b14d6a866db884ea8aee5ab02786886ecf9f25e974";
	},

	requester: function(method, params, cb) {
		var requestOptions = {
			'uri': params.uri,
			'json': params.body || true
		};
		if(params.headers) requestOptions.headers = params.headers;
		if(params.authorization) requestOptions.headers.authorization = params.authorization;
		if(params.qs) requestOptions.qs = params.qs;
		if(params.form !== undefined) requestOptions.form = params.form;

		console.log('===========================================================================');
		console.log('==== URI     :', params.uri);
		request[method](requestOptions, function(err, response, body) {
			return cb(err, body);
		});
	}
};