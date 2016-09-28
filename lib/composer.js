"use strict";
var fs = require("fs");
var async = require("async");
var soajs = require("soajs");
var utils = require("soajs/lib/utils");
var _config = require("../config");

var context = {};

var methods = ['post', 'put', 'get', 'delete'];
var composer = {

	init: function (configLocation, oneConfig, profileType) {
		if (profileType === 'service') {

			composer.validateServiceConfiguration(configLocation, oneConfig);

			context[oneConfig.serviceName] = {
				dirname: configLocation,
				config: oneConfig,
				injection: (Object.hasOwnProperty.call(oneConfig, "injection")) ? oneConfig.injection : true,
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
				injection: (Object.hasOwnProperty.call(oneConfig, "injection")) ? oneConfig.injection : true,
				daemonJobs: {},
				daemon: {},
				dbs: {},
				es: {},
				workflow: {}
			};
		}
	},

	initESClient: function (context, registry, dbPrefix, dbName, logger, callback) {

		if (context.esKeepAlive && context.driver) {
			logger.debug("1", "reusing ES connection of: ", dbName);
			return callback(null, true);
		}
		else {
			if (!registry.coreDB || !registry.coreDB[dbName]) {
				return callback(new Error("Unable to find any ES configuration"));
			}

			var elasticsearch = require("elasticsearch");
			var deleteByQuery = require('elasticsearch-deletebyquery');
			context.esKeepAlive = false;

			var hosts = [];

			var protocol = registry.coreDB[dbName].URLParam.protocol || "http";
			var username = (registry.coreDB[dbName].credentials) ? registry.coreDB[dbName].credentials.username : "";
			var password = (registry.coreDB[dbName].credentials) ? registry.coreDB[dbName].credentials.password : "";

			registry.coreDB[dbName].servers.forEach(function (oneSrvr) {
				var host = oneSrvr.host;
				var port = oneSrvr.port;

				var url;
				if (username && username !== '') {
					url = protocol + "://" + username + ":" + password + "@" + host + ":" + port + "/";
				}
				else {
					url = protocol + "://" + host + ":" + port + "/";
				}

				hosts.push(url)
			});

			var esConfig = {
				hosts: hosts,
				plugins: [deleteByQuery]
			};

			for (var i in registry.coreDB[dbName].extraParam) {
				esConfig[i] = registry.coreDB[dbName].extraParam[i];

				if (i === 'keepAlive') {
					context.esKeepAlive = registry.coreDB[dbName].extraParam[i];
				}
			}

			if (!context.esKeepAlive || !context.driver) {
				logger.debug("creating new ES connection for: ", dbName);
				context.driver = new elasticsearch.Client(esConfig);
				context.driver.ping({
					requestTimeout: registry.coreDB[dbName].extraParam.requestTimeout || 3000,
					hello: "elasticsearch!"
				}, callback);
			}
			else {
				logger.debug("2", "reusing ES connection of: ", dbName);
				return callback(null, true);
			}
		}
	},

	/**
	 * Daemon functionality
	 */
	validateDaemonConfiguration: function (loc, config) {
		if (!config && typeof(config) !== 'object' || Object.keys(config).length === 0) {
			throw new Error(_config.errors[400]);
		}

		if (!config.serviceName) {
			throw new Error(_config.errors[401]);
		}

		if (!config.serviceGroup) {
			throw new Error(_config.errors[403]);
		}

		if (!config.dbs) {
			throw new Error(_config.errors[404]);
		}

		if (!config.servicePort) {
			throw new Error(_config.errors[405]);
		}

		if (!config.schema || typeof(config.schema) !== 'object' && Object.keys(config.schema).length === 0) {
			throw new Error(_config.errors[406]);
		}

		for (var jobName in config.schema) {
			if (!config.schema[jobName]._apiInfo || typeof(config.schema[jobName]._apiInfo) !== 'object' || !config.schema[jobName]._apiInfo.l) {
				throw new Error(_config.errors[407].replace("%jobname%", jobName));
			}

			if (!config.schema[jobName].mw) {
				throw new Error(_config.errors[408].replace("%jobname%", jobName));
			}

			//mw can either be an object or a string representing a filepath
			if (typeof(config.schema[jobName].mw) === 'string') {
				if (!fs.existsSync(config.schema[jobName].mw)) {
					throw new Error(_config.errors[408].replace("%jobname%", jobName));
				}
			}
			else if (typeof(config.schema[jobName].mw) === 'object') {
				if (Object.keys(config.schema[jobName].mw).length === 0) {
					throw new Error(_config.errors[408].replace("%jobname%", jobName));
				}
			}
			else {
				//invalid mw given
				throw new Error(_config.errors[408].replace("%jobname%", jobName));
			}
		}
	},

	generateDaemon: function (daemonName, cb) {
		composer.renderDaemonConfig(daemonName);

		//populate the jobs & workflow mw business logic
		async.forEachOf(context[daemonName].daemonJobs, function (value, key, callback) {
			var _core = soajs;
			if (!value.mw) {
				return callback(null, true);
			}

			var workflow = {};
			for (var state in context[daemonName].daemonJobs[key].mw) {
				workflow[state] = context[daemonName].daemonJobs[key].mw[state];
			}
			context[daemonName].workflow[key] = workflow;
			workflow = {};

			context[daemonName].daemonJobs[key].wf = function (soajs, next) {

				//add a reference to soajs.mongo
				soajs.mongo = {};

				//add a reference to soajs utils
				soajs.utils = utils;

				//create all the db connections needed
				async.each(context[daemonName].config.dbs, buildDbConnection, function (error) {
					if (error) {
						soajs.log.error(error);
						next();
					}
					else {
						//hook up the db connections
						if (Object.keys(context[daemonName].dbs).length > 0) {
							soajs.mongo = context[daemonName].dbs
						}

						if (Object.keys(context[daemonName].es).length > 0) {
							soajs.es = context[daemonName].es;
						}

						//clone the config obj and hook it
						soajs.config = utils.cloneObj(context[daemonName].config);

						delete soajs.config.schema;
						delete soajs.config.type;
						delete soajs.config.dbs;

						var list = [];
						for (var step in context[daemonName].workflow[key]) {
							list.push(async.apply(context[daemonName].workflow[key][step], soajs));
						}

						//hooking up a new wrapper for res.json that terminates mt db connections
						var exitJob = function (soajs, info) {
							context[daemonName].config.dbs.forEach(function (oneDB) {
								var dbName = oneDB.name;
								if (oneDB.es) {
									if (!context[daemonName].es[dbName].esKeepAlive) {
										soajs.es[dbName].driver.close();
										soajs.log.debug("destroying connection for: ", dbName);
									}
								}
								if (soajs.mongo[dbName]) {
									soajs.log.debug("destroying connection for: ", dbName);
									soajs.mongo[dbName].closeDb();
									context[daemonName].dbs[dbName] = null;
								}
							});

							if (info.error) {
								soajs.log.error(info.error);
							}

							if (info.data) {
								if (Array.isArray(info.data)) {
									info.data.forEach(function (oneDataInfo) {
										if (oneDataInfo) {
											soajs.log.info(oneDataInfo);
										}
									});
								}
								else {
									soajs.log.info(info.data);
								}
							}
							next();
						};
						async.series(list, function (error, response) {
							exitJob(soajs, {error: error, data: response});
						});
					}
				});

				function buildDbConnection(oneDB, cb) {
					var dbName = oneDB.name;
					if (oneDB.es) {
						if (!context[daemonName].es[dbName]) {
							context[daemonName].es[dbName] = {};
						}
						composer.initESClient(context[daemonName].es[dbName], soajs.registry, oneDB.prefix, oneDB.name, soajs.log, cb);
					}
					else if (!oneDB.multitenant) {
						//if (!context[daemonName].dbs[dbName]) {
						var dbConfiguration = soajs.registry.coreDB[oneDB.name];
						dbConfiguration.prefix = oneDB.prefix;
						context[daemonName].dbs[dbName] = new _core.mongo(dbConfiguration);
						soajs.log.debug("creating connection for: ", dbName);
						// }
						// else {
						// 	soajs.log.debug("reusing connection of: ", dbName);
						// }
						return cb(null, true);
					}
					else {
						var dbConfig = soajs.meta.tenantDB(soajs.registry.tenantMetaDB, oneDB.name, soajs.tenant.code);
						dbConfig.prefix = oneDB.prefix;
						context[daemonName].dbs[dbName] = new _core.mongo(dbConfig);
						soajs.log.debug("creating connection for: ", dbName);
						return cb(null, true);
					}
				}
			};

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

			//delete context[daemonName].config.schema[api].mw;
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
	validateServiceConfiguration: function (loc, config) {
		if (!config && typeof(config) !== 'object' || Object.keys(config).length === 0) {
			throw new Error(_config.errors[400]);
		}

		if (!config.serviceName) {
			throw new Error(_config.errors[402]);
		}

		if (!config.serviceGroup) {
			throw new Error(_config.errors[403]);
		}

		if (!config.dbs) {
			throw new Error(_config.errors[404]);
		}

		if (!config.servicePort) {
			throw new Error(_config.errors[405]);
		}

		if (!config.schema || typeof(config.schema) !== 'object' && Object.keys(config.schema).length === 0) {
			throw new Error(_config.errors[406]);
		}

		//commonfields can either be an object or a string pointing to a file
		if (config.schema.commonFields) {
			if (typeof(config.schema.commonFields) === 'string') {
				if (!fs.existsSync(config.schema.commonFields)) {
					throw new Error(_config.errors[410]);
				}
			}
			else if (typeof(config.schema.commonFields) === 'object') {
				if (Object.keys(config.schema.commonFields).length === 0) {
					throw new Error(_config.errors[410]);
				}
			}
			else {
				throw new Error(_config.errors[410]);
			}
		}

		for (var method in config.schema) {
			method = method.toLowerCase();
			if (method === 'commonfields') {
				continue;
			}
			else if (methods.indexOf(method) !== -1) {
				for (var api in config.schema[method]) {
					if (!config.schema[method][api]._apiInfo || typeof(config.schema[method][api]._apiInfo) !== 'object' || !config.schema[method][api]._apiInfo.l) {
						throw new Error(_config.errors[411].replace("%api%", api));
					}

					if (!config.schema[method][api].mw) {
						throw new Error(_config.errors[412].replace("%api%", api));
					}

					//mw can either be an object or a string representing a filepath
					if (typeof(config.schema[method][api].mw) === 'string') {
						if (!fs.existsSync(config.schema[method][api].mw)) {
							throw new Error(_config.errors[412].replace("%api%", api));
						}
					}
					else if (typeof(config.schema[method][api].mw) === 'object') {
						if (Object.keys(config.schema[method][api].mw).length === 0) {
							throw new Error(_config.errors[412].replace("%api%", api));
						}
					}
					else {
						//invalid mw given
						throw new Error(_config.errors[412].replace("%api%", api));
					}
				}
			}
			//backward compatible
			else {
				if (!config.schema[method]._apiInfo || typeof(config.schema[method]._apiInfo) !== 'object' || !config.schema[method]._apiInfo.l) {
					throw new Error(_config.errors[411].replace("%api%", method));
				}

				if (!config.schema[method].mw) {
					throw new Error(_config.errors[412].replace("%api%", method));
				}

				//mw can either be an object or a string representing a filepath
				if (typeof(config.schema[method].mw) === 'string') {
					if (!fs.existsSync(config.schema[method].mw)) {
						throw new Error(_config.errors[412].replace("%api%", method));
					}
				}
				else if (typeof(config.schema[method].mw) === 'object') {
					if (Object.keys(config.schema[method].mw).length === 0) {
						throw new Error(_config.errors[412].replace("%api%", method));
					}
				}
				else {
					//invalid mw given
					throw new Error(_config.errors[412].replace("%api%", method));
				}
			}
		}
	},

	generateService: function (serviceName, cb) {
		var _self = this;
		composer.renderServiceConfig(serviceName);

		//initialize workflow
		var __composerInit = function (req, res, next) {
			//add a reference to soajs.mongo
			req.soajs.mongo = {};

			//add a reference to soajs utils
			req.soajs.utils = utils;

			async.each(context[serviceName].config.dbs, buildDBConnection, function (error) {
				if (error) {
					req.soajs.log.error(error);
					return res.json(req.soajs.buildResponse({code: 400, msg: error}));
				}

				//hook up the db connections
				if (Object.keys(context[serviceName].dbs).length > 0) {
					req.soajs.mongo = context[serviceName].dbs;
				}

				if (Object.keys(context[serviceName].es).length > 0) {
					req.soajs.es = context[serviceName].es;
				}

				//clone the config obj and hook it
				req.soajs.config = utils.cloneObj(context[serviceName].config);

				delete req.soajs.config.schema;
				delete req.soajs.config.type;
				delete req.soajs.config.dbs;

				//hooking up a new wrapper for res.json that terminates mt db connections
				if (!res.soajs) {
					res.soajs = {};
				}
				res.soajs.returnAPIResponse = function (req, res, info) {
					context[serviceName].config.dbs.forEach(function (oneDB) {
						var dbName = oneDB.name;
						if (oneDB.es) {
							if (!context[serviceName].es[dbName].esKeepAlive) {
								req.soajs.es[dbName].driver.close();
								req.soajs.log.debug("destroying connection for: ", dbName);
							}
						}
						if (oneDB.multitenant && req.soajs.mongo[dbName]) {
							req.soajs.log.debug("destroying connection for: ", dbName);
							req.soajs.mongo[dbName].closeDb();
						}
					});

					if (info === false) {
						return res.json(req.soajs.buildResponse(null, false));
					}

					if (info.error) {
						if (Array.isArray(info.error)) {
							info.error.forEach(function (oneErr) {
								if (!oneErr.msg && oneErr.message) {
									oneErr.msg = oneErr.message;
								}
								req.soajs.log.error(oneErr.msg);
							});
							return res.json(req.soajs.buildResponse(info.error));
						}
						else {
							var msg = context[serviceName].config.errors[info.code];
							if (typeof info.error === 'boolean' && info.errorMsg) {
								msg = info.errorMsg;
							}
							else {
								req.soajs.log.error(info.error);
								if (typeof(info.error) === 'string') {
									msg = info.error;
								}
							}
							return res.json(req.soajs.buildResponse({
								"code": info.code,
								"msg": msg
							}));
						}
					}
					else {
						return res.json(req.soajs.buildResponse(null, info.data));
					}
				};

				next();
			});

			function buildDBConnection(oneDB, cb) {
				var dbName = oneDB.name;
				if (oneDB.es) {
					if (!context[serviceName].es[dbName]) {
						context[serviceName].es[dbName] = {};
					}
					composer.initESClient(context[serviceName].es[dbName], req.soajs.registry, oneDB.prefix, oneDB.name, req.soajs.log, cb);
				}
				else if (!oneDB.multitenant) {
					if (!context[serviceName].dbs[dbName]) {
						var dbConfiguration = req.soajs.registry.coreDB[oneDB.name];
						dbConfiguration.prefix = oneDB.prefix;
						context[serviceName].dbs[dbName] = new soajs.mongo(dbConfiguration);
						req.soajs.log.debug("creating connection for: ", dbName);
					}
					else {
						req.soajs.log.debug("reusing connection of: ", dbName);

					}
					return cb(null, true);
				}
				else {
					var dbConfig = req.soajs.meta.tenantDB(req.soajs.registry.tenantMetaDB, oneDB.name, req.soajs.tenant.code);
					dbConfig.prefix = oneDB.prefix;
					context[serviceName].dbs[dbName] = new soajs.mongo(dbConfig);
					req.soajs.log.debug("creating connection for: ", dbName);
					return cb(null, true);
				}
			}
		};

		if (context[serviceName].newStyle) {
			var serviceMethods = Object.keys(context[serviceName].serviceAPIs);
			async.each(serviceMethods, function (method, callback) {
				buildWorkflowFromAPIs(context[serviceName].serviceAPIs[method], callback);
			}, cb);
		}
		else {
			buildWorkflowFromAPIs(context[serviceName].serviceAPIs, cb);
		}

		function buildWorkflowFromAPIs(serviceAPIs, cb) {
			//populate the apis & workflow mw business logic
			for(var oneApiName in serviceAPIs){
				var oneApi = serviceAPIs[oneApiName];
				var workflow = {
					'__composerInit': __composerInit
				};

				if (!context[serviceName].injection) {
					for (var state in oneApi.mw) {
						workflow[state] = oneApi.mw[state];
					}
				}

				oneApi.wf = [];
				//push workflow steps as api middlewares
				for (var step in workflow) {
					oneApi.wf.push(workflow[step]);
				}
				serviceAPIs[oneApiName] = oneApi;
			}
			return cb(null, true);
		}
	},

	renderServiceConfig: function (serviceName) {
		for (var method in context[serviceName].config.schema) {
			if (method === 'commonFields') {
				if (typeof(context[serviceName].config.schema[method]) === 'string') {
					context[serviceName].config.schema[method] = require(context[serviceName].config.schema[method]);
				}
				continue;
			}

			method = method.toString();
			context[serviceName].serviceAPIs[method] = {};
			if (methods.indexOf(method) !== -1) {
				context[serviceName].newStyle = true;
				renderNewStyle(method);
			}
			else {
				context[serviceName].newStyle = false;
				renderOldStyle(method);
			}

		}

		function renderNewStyle(method) {
			for (var api in context[serviceName].config.schema[method]) {

				var value = context[serviceName].config.schema[method][api];

				if (value.imfv && value.imfv.commonFields) {
					if (typeof(value.imfv.commonFields) === 'string') {
						value.imfv.commonFields = require(value.imfv.commonFields);
					}

					if (Array.isArray(value.imfv.commonFields) && value.imfv.commonFields.length > 0) {
						context[serviceName].config.schema[method][api].commonFields = utils.cloneObj(value.imfv.commonFields);
					}
				}

				if (value.imfv && value.imfv.custom) {
					if (typeof(value.imfv.custom) === 'string') {
						value.imfv.custom = require(value.imfv.custom);
					}

					if (typeof(value.imfv.custom) === 'object' && Object.keys(value.imfv.custom).length > 0) {
						for (var field in value.imfv.custom) {
							context[serviceName].config.schema[method][api][field] = utils.cloneObj(value.imfv.custom[field]);
						}
					}
				}

				if (!context[serviceName].injection) {
					context[serviceName].config.schema[method][api].mw = require(context[serviceName].config.schema[method][api].mw);
				}
				else {
					context[serviceName].config.schema[method][api].mw = context[serviceName].config.schema[method][api].mw;
				}
				context[serviceName].serviceAPIs[method][api] = {
					"method": method,
					"_apiInfo": context[serviceName].config.schema[method][api]._apiInfo,
					"mw": utils.cloneObj(context[serviceName].config.schema[method][api].mw)
				};

				delete context[serviceName].config.schema[method][api].mw;
				delete context[serviceName].config.schema[method][api].imfv;
				delete context[serviceName].config.schema[method][api].model;
			}
		}

		function renderOldStyle(method) {
			var value = context[serviceName].config.schema[method];

			if (value.imfv && value.imfv.commonFields) {
				if (typeof(value.imfv.commonFields) === 'string') {
					value.imfv.commonFields = require(value.imfv.commonFields);
				}

				if (Array.isArray(value.imfv.commonFields) && value.imfv.commonFields.length > 0) {
					context[serviceName].config.schema[method].commonFields = utils.cloneObj(value.imfv.commonFields);
				}
			}

			if (value.imfv && value.imfv.custom) {
				if (typeof(value.imfv.custom) === 'string') {
					value.imfv.custom = require(value.imfv.custom);
				}

				if (typeof(value.imfv.custom) === 'object' && Object.keys(value.imfv.custom).length > 0) {
					for (var field in value.imfv.custom) {
						context[serviceName].config.schema[method][field] = utils.cloneObj(value.imfv.custom[field]);
					}
				}
			}

			context[serviceName].config.schema[method].mw = require(context[serviceName].config.schema[method].mw);
			context[serviceName].serviceAPIs[method].method = method;
			context[serviceName].serviceAPIs[method]._apiInfo = context[serviceName].config.schema[method]._apiInfo;
			context[serviceName].serviceAPIs[method].mw = utils.cloneObj(context[serviceName].config.schema[method].mw);

			delete context[serviceName].config.schema[method].method;
			delete context[serviceName].config.schema[method].mw;
			delete context[serviceName].config.schema[method].imfv;
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

			if(context[serviceName].newStyle){
				for( var method in context[serviceName].serviceAPIs){
					for(var api in context[serviceName].serviceAPIs[method]){
						method = (method === 'del') ? 'delete' : method;
						context[serviceName].service[method](api, context[serviceName].serviceAPIs[method][api].wf);
					}
				}
			}
			else{
				//generate the service apis
				for (var oneAPI in context[serviceName].serviceAPIs) {
					if (Object.hasOwnProperty.call(context[serviceName].serviceAPIs, oneAPI)) {
						var method = context[serviceName].serviceAPIs[oneAPI].method.toLowerCase();
						method = (method === 'del') ? 'delete' : method;
						context[serviceName].service[method](oneAPI, context[serviceName].serviceAPIs[oneAPI].wf);
					}
				}
			}

			//start service and return cb
			context[serviceName].service.start(cb);
		});
	}

};

module.exports = composer;