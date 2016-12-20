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
	},
	
	getService: function(serviceName){
		return composer.getContext(serviceName, 'service');
	},
	
	stopService: function(serviceName, cb){
		var context = composer.getContext(serviceName, 'service');
		context.stop(cb);
	}
	
	// getDaemon: function(daemoName){
	// 	return composer.getContext(daemoName, 'daemon');
	// },
	//
	// stopDaemon: function(daemoName, cb){
	// 	var context = composer.getContext(daemoName, 'daemon');
	// 	context.stop(cb);
	// }
};