"use strict";
var fs = require("fs");
var core = require("soajs");
var _config = require("../../config");
var async = require("async");
var utils = require("soajs/lib/utils");

var lib = {
	"requireModel": function (filePath, cb) {
		if (cb && typeof(cb) === 'function') {
			fs.exists(filePath, function (exists) {
				if (!exists) {
					return cb(new Error("Requested Model Not Found!"));
				}
				return cb(null, require(filePath));
			});
		}
		else {
			return fs.existsSync(filePath);
		}
	},

	"createConnections": function (oneDB, context, modelName, soajs, cb) {
		var dbName = oneDB.name;
		var newStyle = (modelName) ? true : false;
		modelName = (modelName) ? modelName : "mongo";
		context[modelName] = context[modelName] || {};
		
		console.log(oneDB);
		if (oneDB.es) {
			modelName = (newStyle) ? modelName : "es";
			context[modelName][dbName] = {};
			soajs.log.debug("creating connection for: ", dbName);
			var dbConfiguration = soajs.registry.coreDB[oneDB.name];
			if (!dbConfiguration) {
				soajs.log.error("Missing dbConfiguration for:");
				soajs.log.error(oneDB);
				return cb(new Error("Missing dbConfiguration for:", oneDB.name));
			}
			else {
				dbConfiguration.prefix = oneDB.prefix;
				context[modelName][dbName] = new core.es(dbConfiguration);
				if (newStyle) {
					return cb(null, true);
				}
				else {
					context[modelName][dbName].ping(function (error) {
						if (error) {
							return cb(error);
						}
						//only needed for old services and backward compatibility
						context[modelName][dbName].driver = context[modelName][dbName].db;
						return cb(null, true);
					});
				}
			}
		}
		else if (!oneDB.multitenant) {
			var dbConfiguration = soajs.registry.coreDB[oneDB.name];
			if (!dbConfiguration) {
				soajs.log.error("Missing db config for: ", oneDB.name);
				return cb(new Error("Missing db config for: ", oneDB.name));
			}
			dbConfiguration.prefix = oneDB.prefix;
			context[modelName][dbName] = new core.mongo(dbConfiguration);
			soajs.log.debug("creating connection for: ", dbName);
			return cb(null, true);
		}
		else {
			var dbConfig = soajs.meta.tenantDB(soajs.registry.tenantMetaDB, oneDB.name, soajs.tenant.code);
			if (!dbConfig) {
				soajs.log.error("Missing db config for: ", oneDB.name);
				return cb(new Error("Missing db config for: ", oneDB.name));
			}
			dbConfig.prefix = oneDB.prefix;
			context[modelName][dbName] = new core.mongo(dbConfig);
			soajs.log.debug("creating connection for: ", dbName);
			return cb(null, true);
		}
	},

	"cleanupConnection1": function (oneDB, context, daemonName, soajs) {
		var dbName = oneDB.name;
		if (oneDB.es) {
			soajs.es[dbName].driver.close();
			delete context[daemonName].es[dbName];
			soajs.log.debug("destroying connection for: ", dbName);
		}
		if (soajs.mongo[dbName]) {
			soajs.log.debug("destroying connection for: ", dbName);
			delete context[daemonName].dbs[dbName];
			soajs.mongo[dbName].closeDb();
		}
	},

	"cleanupConnection2": function (oneDB, context, daemonName, modelName, soajs) {
		if (oneDB[modelName]) {
			var dbName = oneDB.name;
			if (oneDB.es) {
				if(Object.keys(soajs[modelName][dbName]).indexOf('driver') !== -1){
					soajs[modelName][dbName].driver.close();
				}
				else{
					soajs[modelName][dbName].close();
				}
				delete context[daemonName][modelName][dbName];
				soajs.log.debug("destroying connection for: ", dbName);
			}
			
			if (oneDB.multitenant && soajs[modelName][dbName]) {
				soajs[modelName][dbName].closeDb();
				delete context[daemonName][modelName][dbName];
				soajs.log.debug("destroying connection for: ", dbName);
			}
		}
	},

	"injectDaemonResponse": function (context, daemonName) {
		return function (soajs, next, info) {
			
			if (context[daemonName].injection) {
				soajs.model.closeConnections();
			}
			else {
				context[daemonName].config.dbs.forEach(function (oneDB) {
					lib.cleanupConnection1(oneDB, context, daemonName, soajs);
				});
			}

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
		}
	},

	"loadAndInjectModel": function (context, daemonName) {
		return function (soajs, next) {
			if (!soajs.config) {
				soajs.config = utils.cloneObj(context[daemonName].config);
			}

			var modelPath = context[daemonName].config.models.path;
			var modelName = (soajs.servicesConfig && soajs.servicesConfig.model) ? soajs.servicesConfig.model : soajs.config.models.name;
			modelPath += modelName + ".js";

			return lib.requireModel(modelPath, function (error, modelInstance) {
				if (error) {
					return next(error);
				}

				wrapModel(modelInstance);
				soajs.model = modelInstance;
				soajs.model.initConnections(soajs, function () {
					next();
				});
			});

			function wrapModel(modelInstance) {

				modelInstance.initConnections = function (soajs, callback) {
					context[daemonName][modelName] = {};
					async.each(context[daemonName].config.dbs, buildDBConnection, function (error) {
						if (error) {
							soajs.log.error(error);
							return next({code: 400, msg: error});
						}
						soajs[modelName] = context[daemonName][modelName];
						return callback(null, true);
					});
				};

				modelInstance.closeConnections = function () {
					context[daemonName].config.dbs.forEach(function (oneDB) {
						lib.cleanupConnection2(oneDB, context, daemonName, modelName, soajs);
					});
				};
			}

			function buildDBConnection(oneDB, cb) {
				if (oneDB[modelName]) {
					lib.createConnections(oneDB, context[daemonName], modelName, soajs, cb);
				}
				else return cb(null, true);
			}
		};
	}
};

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

		if (config.models && config.models.path && config.models.name) {
			var modelPath = config.models.path;
			var modelName = config.models.name;
			modelPath += modelName + ".js";
			if (!lib.requireModel(modelPath)) {
				throw new Error(_config.errors[413]);
			}
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
			if (!value.mw) {
				return callback(null, true);
			}

			var workflow = {};
			for (var state in context[daemonName].daemonJobs[key].mw) {
				workflow[state] = context[daemonName].daemonJobs[key].mw[state];
			}
			context[daemonName].workflow[key] = workflow;

			context[daemonName].daemonJobs[key].wf = function (soajs, next) {
				
				
				//add a reference to soajs utils
				soajs.utils = utils;

				if (!soajs.config) {
					soajs.config = utils.cloneObj(context[daemonName].config);
				}
				var exitJob = lib.injectDaemonResponse(context, daemonName);

				//create all the db connections needed
				async.each(context[daemonName].config.dbs, buildDbConnection, function (error) {
					if (error) {
						soajs.log.error(error);
						next();
					}
					else {
						if (context[daemonName].mongo && Object.keys(context[daemonName].mongo).length > 0) {
							soajs.mongo = context[daemonName].mongo;
						}

						if (context[daemonName].es && Object.keys(context[daemonName].es).length > 0) {
							soajs.es = context[daemonName].es;
						}

						delete soajs.config.schema;
						delete soajs.config.type;
						delete soajs.config.dbs;

						var list = [];
						if (context[daemonName].injection) {
							var step0 = lib.loadAndInjectModel(context, daemonName);
							list.push(async.apply(step0, soajs));
						}
						for (var step in context[daemonName].workflow[key]) {
							list.push(async.apply(context[daemonName].workflow[key][step], soajs));
						}

						async.series(list, function (error, response) {
							exitJob(soajs, next, {error: error, data: response});
						});
					}
				});

				function buildDbConnection(oneDB, cb) {
					if (context[daemonName].injection) {
						return cb(null, true);
					}
					lib.createConnections(oneDB, context[daemonName], null, soajs, cb);
				}
			};

			return callback(null, true);
		}, cb);
	},

	renderDaemonConfig: function (context, daemonName) {
		for (var api in context[daemonName].config.schema) {
			api = api.toString();
			context[daemonName].daemonJobs[api] = {
				mw: require(context[daemonName].config.schema[api].mw)
			};

			if (context[daemonName].config.schema[api]._apiInfo) {
				context[daemonName].config.schema[api].l = context[daemonName].config.schema[api]._apiInfo.l;
			}
			delete context[daemonName].config.schema[api].mw;
			delete context[daemonName].config.schema[api]._apiInfo;
		}
	},

	buildRunDaemon: function (context, daemonName, cb) {
		//create a new daemon instance
		context[daemonName].daemon = new core.server.daemon(context[daemonName].config);

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