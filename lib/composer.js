"use strict";
var daemon = require("./daemon/");
var service = require("./service/");

var context = {};

var composer = {
	
	init: function (configLocation, oneConfig, profileType) {
		if (profileType === 'service') {
			composer.validateServiceConfiguration(configLocation, oneConfig);
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
			composer.validateDaemonConfiguration(configLocation, oneConfig);
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
	validateDaemonConfiguration: function (loc, config) {
		daemon.validateDaemonConfiguration(loc, config);
	},
	
	generateDaemon: function (daemonName, cb) {
		composer.renderDaemonConfig(daemonName);
		daemon.generateDaemon(context, daemonName, this, cb)
	},
	
	renderDaemonConfig: function (daemonName) {
		daemon.renderDaemonConfig(context, daemonName);
	},
	
	buildRunDaemon: function (daemonName, cb) {
		daemon.buildRunDaemon(context, daemonName, cb);
	},
	
	/**
	 * Service functionality
	 */
	validateServiceConfiguration: function (loc, config) {
		service.validateServiceConfiguration(loc, config);
	},
	
	injectComposerResponse: function (context, serviceName) {
		service.injectComposerResponse(context, serviceName);
	},
	
	generateService: function (serviceName, cb) {
		composer.renderServiceConfig(serviceName);
		service.generateService(context, serviceName, this, cb);
	},
	
	renderServiceConfig: function (serviceName) {
		service.renderServiceConfig(context, serviceName);
	},
	
	buildRunService: function (serviceName, cb) {
		service.buildRunService(context, serviceName, cb);
	}
};

module.exports = composer;