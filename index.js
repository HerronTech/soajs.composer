"use strict";
var composer = require("./lib/composer");

module.exports = {
	deploy: function (configLocation, callback) {
		var gConfig = require(configLocation);
		var profileType = gConfig.type;
		delete gConfig.type;

		var loc = configLocation.split("/");
		loc.pop();
		loc.pop();
		loc = loc.join("/");

		try{
			composer.init(loc, gConfig, profileType);
		}
		catch(e){
			return callback(e);
		}

		switch (profileType) {
			case "daemon":
				composer.generateDaemon(gConfig.serviceName, function (error) {
					if (error) {
						return callback(error);
					}
					composer.buildRunDaemon(gConfig.serviceName, callback);
				});
				break;
			default:
				composer.generateService(gConfig.serviceName, function (error) {
					if (error) {
						return callback(error);
					}
					composer.buildRunService(gConfig.serviceName, callback);
				});
				break;
		}
	}
};