"use strict";
var fs = require("fs");
var soajs = require("soajs");
var _config = require("../../config");
var async = require("async");
var utils = require("soajs/lib/utils");

var daemon = {

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

	generateDaemon: function (context, daemonName, composer, cb) {
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

	renderDaemonConfig: function (context, daemonName) {
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

	buildRunDaemon: function (context, daemonName, cb) {
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
	}
};

module.exports = daemon;