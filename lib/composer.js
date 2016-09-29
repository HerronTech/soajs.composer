"use strict";
var daemon = require("./daemon/");
var service = require("./service/");

var context = {};

var composer = {
	
	init: function (configLocation, oneConfig, profileType) {
		if (profileType === 'service') {
			service.validateServiceConfiguration(configLocation, oneConfig);
			context[oneConfig.serviceName] = {
				dirname: configLocation,
				config: oneConfig,
				injection: (Object.hasOwnProperty.call(oneConfig, "injection")) ? oneConfig.injection : false,
				serviceAPIs: {},
				service: {},
				dbs: {},
				es: {}
			};
		}
		else {
			daemon.validateDaemonConfiguration(configLocation, oneConfig);
			context[oneConfig.serviceName] = {
				dirname: configLocation,
				config: oneConfig,
				injection: (Object.hasOwnProperty.call(oneConfig, "injection")) ? oneConfig.injection : false,
				daemonJobs: {},
				daemon: {},
				dbs: {},
				es: {},
				workflow: {}
			};
		}
	},
	
	/**
	 * Daemon functionality
	 */
	generateDaemon: function (daemonName, cb) {
		daemon.renderDaemonConfig(context, daemonName);
		daemon.generateDaemon(context, daemonName, this, cb)
	},
	
	buildRunDaemon: function (daemonName, cb) {
		daemon.buildRunDaemon(context, daemonName, cb);
	},
	
	/**
	 * Service functionality
	 */
	generateService: function (serviceName, cb) {
		service.renderServiceConfig(context, serviceName);
		service.generateService(context, serviceName, this, cb);
	},
	
	buildRunService: function (serviceName, cb) {
		service.buildRunService(context, serviceName, cb);
	}
};

module.exports = composer;