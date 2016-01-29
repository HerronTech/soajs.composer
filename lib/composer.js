"use strict";
var fs = require("fs");
var async = require("async");
var soajs = require("soajs");
var utils = require("soajs/lib/utils");
var _config = require("../config");

var context = {};

var composer = {
	init: function (configLocation, oneConfig, profileType) {
		if (profileType === 'service') {

			composer.validateServiceConfiguration(configLocation, oneConfig);

			context[oneConfig.serviceName] = {
				dirname: configLocation,
				config: oneConfig,
				serviceAPIs: {},
				service: {},
				dbs:{}
			};
		}
		else {
			composer.validateDaemonConfiguration(configLocation, oneConfig);

			context[oneConfig.serviceName] = {
				dirname: configLocation,
				config: oneConfig,
				daemonJobs: {},
				daemon: {},
				dbs:{}
			};
		}
	},

	/**
	 * Daemon functionality
	 */
	validateDaemonConfiguration: function(loc, config){
		if(!config && typeof(config) !== 'object' || Object.keys(config).length === 0){
			throw new Error(_config.errors[400]);
		}

		if(!config.serviceName){
			throw new Error(_config.errors[401]);
		}

		if(!config.serviceGroup){
			throw new Error(_config.errors[403]);
		}

		if(!config.dbs){
			throw new Error(_config.errors[404]);
		}

		if(!config.servicePort){
			throw new Error(_config.errors[405]);
		}

		if(!config.schema || typeof(config.schema) !== 'object' && Object.keys(config.schema).length === 0){
			throw new Error(_config.errors[406]);
		}

		for(var jobName in config.schema){
			if(!config.schema[jobName]._apiInfo || typeof(config.schema[jobName]._apiInfo) !== 'object' || !config.schema[jobName]._apiInfo.l){
				throw new Error(_config.errors[407].replace("%jobname%", jobName));
			}

			if(!config.schema[jobName].mw){
				throw new Error(_config.errors[408].replace("%jobname%", jobName));
			}

			//mw can either be an object or a string representing a filepath
			if(typeof(config.schema[jobName].mw === 'string')){
				if(!fs.existsSync(config.schema[jobName].mw)){
					throw new Error(_config.errors[408].replace("%jobname%", jobName));
				}
			}
			else if(typeof(config.schema[jobName].mw) === 'object'){
				if(Object.keys(config.schema[jobName].mw).length === 0){
					throw new Error(_config.errors[408].replace("%jobname%", jobName));
				}
			}
			else{
				//invalid mw given
				throw new Error(_config.errors[408].replace("%jobname%", jobName));
			}
		}
	},

	generateDaemon: function (daemonName, cb) {
		composer.renderDaemonConfig(daemonName);

		//populate the jobs & workflow mw business logic
		var workflow = {};
		var __composerInit = function (soajs, next) {
			//add a reference to soajs.mongo
			soajs.mongo = {};

			//add a reference to soajs utils
			soajs.utils = utils;

			//create all the db connections needed
			context[daemonName].config.dbs.forEach(function (oneDB) {
				if (!oneDB.multitenant) {
					if (!context[daemonName].dbs[oneDB.name]) {
						context[daemonName].dbs[oneDB.name] = new soajs.mongo(soajs.registry.coreDB[oneDB.name]);
						soajs.log.debug("creating connection for: ", oneDB.name);
					}
					else{
						soajs.log.debug("reusing connection of: ", oneDB.name);
					}
				}
				else {
					var dbConfig = soajs.meta.tenantDB(soajs.registry.tenantMetaDB, oneDB.name, soajs.tenant.code);
					context[daemonName].dbs[oneDB.name] = new soajs.mongo(dbConfig);
					soajs.log.debug("creating connection for: ", oneDB.name);
				}
			});

			//hook up the db connections
			soajs.mongo = context[daemonName].dbs;

			//clone the config obj and hook it
			soajs.config = utils.cloneObj(context[daemonName].config);

			delete soajs.config.schema;
			delete soajs.config.type;
			delete soajs.config.dbs;

			//hooking up a new wrapper for res.json that terminates mt db connections
			soajs.exitJob = function (soajs, info) {
				context[daemonName].config.dbs.forEach(function (oneDB) {
					if (oneDB.multitenant && soajs.mongo[oneDB.name]) {
						soajs.log.debug("destroying connection for: ", oneDB.name);
						soajs.mongo[oneDB.name].closeDb();
					}
				});

				if (info.error) {
					soajs.log.error(info.error);
				}

				if(info.data){
					soajs.log.info(info.data);
				}
				next();
			};

			next();
		};

		async.forEachOf(context[daemonName].daemonJobs, function (value, key, callback) {
			if (!value.mw) {
				return callback(null, true);
			}

			workflow.__composerInit = __composerInit;

			for (var state in context[daemonName].daemonJobs[key].mw) {
				workflow[state] = context[daemonName].daemonJobs[key].mw[state];
			}

			context[daemonName].daemonJobs[key].wf = [];
			for (var step in workflow) {
				context[daemonName].daemonJobs[key].wf.push(workflow[step]);
			}
			workflow = {};
			return callback(null, true);

		}, cb);
	},

	renderDaemonConfig: function (daemonName) {
		for (var api in context[daemonName].config.schema) {
			api = api.toString();
			context[daemonName].daemonJobs[api] = {};

			context[daemonName].config.schema[api].mw = require(context[daemonName].config.schema[api].mw);
			context[daemonName].daemonJobs[api]._apiInfo = context[daemonName].config.schema[api]._apiInfo;
			context[daemonName].daemonJobs[api].mw = utils.cloneObj(context[daemonName].config.schema[api].mw);

			if (context[daemonName].config.schema[api]._apiInfo) {
				context[daemonName].config.schema[api].l = context[daemonName].config.schema[api]._apiInfo.l;
			}

			delete context[daemonName].config.schema[api].mw;
			delete context[daemonName].config.schema[api]._apiInfo;
		}
	},

	buildRunDaemon: function (daemonName, cb) {
		//create a new daemon instance
		context[daemonName].daemon = new soajs.server.daemon(context[daemonName].config);

		//initialize the service
		context[daemonName].daemon.init(function () {

			//generate the service apis
			for (var oneJOB in context[daemonName].daemonJobs) {
				if (Object.hasOwnProperty.call(context[daemonName].daemonJobs, oneJOB)) {
					context[daemonName].daemon.job(oneJOB, context[daemonName].daemonJobs[oneJOB].wf);
				}
			}

			//start daemon and return cb
			context[daemonName].daemon.start(cb);
		});
	},

	/**
	 * Service functionality
	 */
	validateServiceConfiguration: function(loc, config){
		if(!config && typeof(config) !== 'object' || Object.keys(config).length === 0){
			throw new Error(_config.errors[400]);
		}

		if(!config.serviceName){
			throw new Error(_config.errors[402]);
		}

		if(!config.serviceGroup){
			throw new Error(_config.errors[403]);
		}

		if(!config.dbs){
			throw new Error(_config.errors[404]);
		}

		if(!config.servicePort){
			throw new Error(_config.errors[405]);
		}

		if(!config.schema || typeof(config.schema) !== 'object' && Object.keys(config.schema).length === 0){
			throw new Error(_config.errors[406]);
		}

		//commonfields can either be an object or a string pointing to a file
		if(config.schema.commonFields){
			if(typeof(config.schema.commonFields) === 'string'){
				if(!fs.existsSync(config.schema.commonFields)){
					throw new Error(_config.errors[410]);
				}
			}
			else if(typeof(config.schema.commonFields) === 'object'){
				if(Object.keys(config.schema.commonFields).length === 0){
					throw new Error(_config.errors[410]);
				}
			}
			else{
				throw new Error(_config.errors[410]);
			}
		}

		for(var api in config.schema){
			if(api === 'commonFields'){
				continue;
			}
			
			if(!config.schema[api]._apiInfo || typeof(config.schema[api]._apiInfo) !== 'object' || !config.schema[api]._apiInfo.l){
				throw new Error(_config.errors[411].replace("%api%", api));
			}

			if(!config.schema[api].mw){
				throw new Error(_config.errors[412].replace("%api%", api));
			}

			//mw can either be an object or a string representing a filepath
			if(typeof(config.schema[api].mw === 'string')){
				if(!fs.existsSync(config.schema[api].mw)){
					throw new Error(_config.errors[412].replace("%api%", api));
				}
			}
			else if(typeof(config.schema[api].mw) === 'object' && Object.keys(config.schema[api].mw).length === 0){
				throw new Error(_config.errors[412].replace("%api%", api));
			}
			else{
				//invalid mw given
				throw new Error(_config.errors[412].replace("%api%", api));
			}
		}
	},

	generateService: function (serviceName, cb) {
		composer.renderServiceConfig(serviceName);

		//initialize workflow
		var workflow = {};
		var __composerInit = function (req, res, next) {
			//add a reference to soajs.mongo
			req.soajs.mongo = {};

			//add a reference to soajs utils
			req.soajs.utils = utils;

			//create all the db connections needed
			context[serviceName].config.dbs.forEach(function (oneDB) {
				if (!oneDB.multitenant) {
					if (!context[serviceName].dbs[oneDB.name]) {
						context[serviceName].dbs[oneDB.name] = new soajs.mongo(req.soajs.registry.coreDB[oneDB.name]);
						req.soajs.log.debug("creating connection for: ", oneDB.name);
					}
					else{
						req.soajs.log.debug("reusing connection of: ", oneDB.name);
					}
				}
				else {
					var dbConfig = req.soajs.meta.tenantDB(req.soajs.registry.tenantMetaDB, oneDB.name, req.soajs.tenant.code);
					context[serviceName].dbs[oneDB.name] = new soajs.mongo(dbConfig);
					req.soajs.log.debug("creating connection for: ", oneDB.name);
				}
			});

			//hook up the db connections
			req.soajs.mongo = context[serviceName].dbs;

			//clone the config obj and hook it
			req.soajs.config = utils.cloneObj(context[serviceName].config);

			delete req.soajs.config.schema;
			delete req.soajs.config.type;
			delete req.soajs.config.dbs;

			//hooking up a new wrapper for res.json that terminates mt db connections
			if(!res.soajs){
				res.soajs = {};
			}
			res.soajs.returnAPIResponse = function (req, res, info) {
				context[serviceName].config.dbs.forEach(function (oneDB) {
					if (oneDB.multitenant && req.soajs.mongo[oneDB.name]) {
						req.soajs.log.debug("destroying connection for: ", oneDB.name);
						req.soajs.mongo[oneDB.name].closeDb();
					}
				});

				if (info.error) {
					req.soajs.log.error(info.error);
					return res.json(req.soajs.buildResponse({"code": info.code, "msg": context[serviceName].config.errors[info.code]}));
				}
				else {
					return res.json(req.soajs.buildResponse(null, info.data));
				}
			};

			next();
		};

		//populate the apis & workflow mw business logic
		async.forEachOf(context[serviceName].serviceAPIs, function (value, key, callback) {
			if (key === 'commonFields' || !value.mw) {
				return callback(null, true);
			}

			//push the first default init middleware
			workflow.__composerInit = __composerInit;

			for (var state in context[serviceName].serviceAPIs[key].mw) {
				workflow[state] = context[serviceName].serviceAPIs[key].mw[state];
			}

			//push workflow steps as api middlewares
			context[serviceName].serviceAPIs[key].wf = [];
			for (var step in workflow) {
				context[serviceName].serviceAPIs[key].wf.push(workflow[step]);
			}

			//reset workflow for next api
			workflow = {};
			return callback(null, true);

		}, cb);
	},

	renderServiceConfig: function (serviceName) {
		for (var api in context[serviceName].config.schema) {
			if (api === 'commonFields') {
				context[serviceName].config.schema[api] = require(context[serviceName].config.schema[api]);
				continue;
			}
			api = api.toString();
			var value = context[serviceName].config.schema[api];
			context[serviceName].serviceAPIs[api] = {};

			if (value.imfv && value.imfv.commonFields && Array.isArray(value.imfv.commonFields) && value.imfv.commonFields.length > 0) {
				context[serviceName].serviceAPIs[api].commonFields = utils.cloneObj(value.imfv.commonFields);
			}

			if (value.imfv && value.imfv.custom && typeof(value.imfv.custom) === 'object' && Object.keys(value.imfv.custom).length > 0) {
				for (var field in value.imfv.custom) {
					context[serviceName].serviceAPIs[api][field] = utils.cloneObj(value.imfv.custom[field]);
				}
			}

			context[serviceName].config.schema[api].mw = require(context[serviceName].config.schema[api].mw);
			context[serviceName].serviceAPIs[api].method = context[serviceName].config.schema[api].method;
			context[serviceName].serviceAPIs[api]._apiInfo = context[serviceName].config.schema[api]._apiInfo;
			context[serviceName].serviceAPIs[api].mw = utils.cloneObj(context[serviceName].config.schema[api].mw);

			delete context[serviceName].config.schema[api].method;
			delete context[serviceName].config.schema[api].mw;
			delete context[serviceName].config.schema[api].imfv;
		}
	},

	buildRunService: function (serviceName, cb) {

		//create a new service instance
		context[serviceName].service = new soajs.server.service(utils.cloneObj(context[serviceName].config));

		//initialize the service
		context[serviceName].service.init(function () {

			/*
			 This api returns the schema of the service.
			 */
			context[serviceName].service.get("/schema", function (req, res) {
				return res.json(req.soajs.buildResponse(null, context[serviceName].config));
			});

			//generate the service apis
			for (var oneAPI in context[serviceName].serviceAPIs) {
				if (Object.hasOwnProperty.call(context[serviceName].serviceAPIs, oneAPI)) {
					var method = context[serviceName].serviceAPIs[oneAPI].method.toLowerCase();
					method = (method === 'del') ? 'delete' : method;
					context[serviceName].service[method](oneAPI, context[serviceName].serviceAPIs[oneAPI].wf);
				}
			}
			//start service and return cb
			context[serviceName].service.start(cb);
		});
	}

};

module.exports = composer;