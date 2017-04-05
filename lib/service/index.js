"use strict";

var fs = require("fs");
var soajs = require("soajs");
var _config = require("../../config");
var async = require("async");
var utils = require("soajs.core.libs").utils;
var methods = ['post', 'put', 'get', 'delete'];

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

	"createConnections": function (oneDB, context, modelName, req, cb) {
		var dbName = oneDB.name;
		var newStyle = (modelName) ? true : false;
		modelName = (modelName) ? modelName : "mongo";
		context[modelName] = context[modelName] || {};
		
		if (oneDB.es) {
			modelName = (newStyle) ? modelName : "es";
			
			if (!context[modelName][dbName]) {
				context[modelName][dbName] = {};
				req.soajs.log.debug("creating connection for: ", dbName);
				var dbConfiguration = req.soajs.registry.coreDB[oneDB.name];
				if (!dbConfiguration) {
					req.soajs.log.error("Missing dbConfiguration for:");
					req.soajs.log.error(oneDB);
					return cb(null, true);
				}
				else {
					dbConfiguration.prefix = oneDB.prefix;
					context[modelName][dbName] = new soajs.es(dbConfiguration);
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
			else {
				req.soajs.log.debug("reusing connection for: ", dbName);
				return cb(null, true);
			}
		}
		else if (!oneDB.multitenant) {
			if (!context[modelName][dbName]) {
				req.soajs.log.debug("creating connection for: ", dbName);
				var dbConfiguration = req.soajs.registry.coreDB[oneDB.name];
				if (dbConfiguration) {
					dbConfiguration.prefix = oneDB.prefix;
					context[modelName][dbName] = new soajs.mongo(dbConfiguration);
				}
				else {
					req.soajs.log.error("Missing registry.coreDB for:", dbName);
				}
			}
			else {
				req.soajs.log.debug("reusing connection of: ", dbName);
			}
			return cb(null, true);
		}
		else {
			var dbConfig = req.soajs.meta.tenantDB(req.soajs.registry.tenantMetaDB, oneDB.name, req.soajs.tenant.code);
			dbConfig.prefix = oneDB.prefix;
			context[modelName][dbName] = new soajs.mongo(dbConfig);
			req.soajs.log.debug("creating connection for: ", dbName);
			return cb(null, true);
		}
	},

	"cleanupConnection1": function (oneDB, context, serviceName, req) {
		var dbName = oneDB.name;
		if (oneDB.es && context[serviceName].es && context[serviceName].es[dbName] && (!context[serviceName].es[dbName].config.extraParam.keepAlive && !context[serviceName].es[dbName].esKeepAlive)) {
			req.soajs.es[dbName].driver.close();
			delete context[serviceName].es[dbName];
			req.soajs.log.debug("destroying connection for: ", dbName);
		}
		if (oneDB.multitenant && req.soajs.mongo[dbName]) {
			req.soajs.log.debug("destroying connection for: ", dbName);
			delete context[serviceName].dbs[dbName];
			req.soajs.mongo[dbName].closeDb();
		}
	},

	"cleanupConnection2": function (oneDB, context, serviceName, modelName, req) {
		if (oneDB[modelName]) {
			var dbName = oneDB.name;
			if (oneDB.es && req.soajs[modelName] && req.soajs[modelName][dbName] && !req.soajs[modelName][dbName].config.extraParam.keepAlive) {
				req.soajs[modelName][dbName].driver.close();
				delete context[serviceName][modelName][dbName];
				req.soajs.log.debug("destroying connection for: ", dbName);
			}

			if (oneDB.multitenant && req.soajs[modelName][dbName]) {
				req.soajs[modelName][dbName].closeDb();
				delete context[serviceName][modelName][dbName];
				req.soajs.log.debug("destroying connection for: ", dbName);
			}
		}
	},

	"renderOneAPI": function (oneAPISchema, oneAPI, newStyle) {
		oneAPI.mw = require(oneAPISchema.mw);

		if (oneAPISchema.imfv && oneAPISchema.imfv.commonFields) {
			if (typeof(oneAPISchema.imfv.commonFields) === 'string') {
				oneAPISchema.imfv.commonFields = require(oneAPISchema.imfv.commonFields);
			}

			if (Array.isArray(oneAPISchema.imfv.commonFields) && oneAPISchema.imfv.commonFields.length > 0) {
				oneAPISchema.commonFields = utils.cloneObj(oneAPISchema.imfv.commonFields);
			}
		}
		if (oneAPISchema.imfv && oneAPISchema.imfv.custom) {
			if (typeof(oneAPISchema.imfv.custom) === 'string') {
				oneAPISchema.imfv.custom = require(oneAPISchema.imfv.custom);
			}

			if (typeof(oneAPISchema.imfv.custom) === 'object' && Object.keys(oneAPISchema.imfv.custom).length > 0) {
				for (var field in oneAPISchema.imfv.custom) {
					oneAPISchema[field] = utils.cloneObj(oneAPISchema.imfv.custom[field]);
				}
			}
		}
		if (newStyle) {
			oneAPI.model = oneAPISchema.model;
			delete oneAPISchema.model;
		}
		else {
			oneAPI.method = oneAPISchema.method;
			delete oneAPISchema.method;
		}

		delete oneAPISchema.mw;
		delete oneAPISchema.imfv;

		return [oneAPISchema, oneAPI];
	},

	"injectComposerResponse": function (context, serviceName) {
		return function (req, res, info) {
			if (!context[serviceName].injection) {
				context[serviceName].config.dbs.forEach(function (oneDB) {
					lib.cleanupConnection1(oneDB, context, serviceName, req);
				});
			}
			else {
				req.soajs.model.closeConnections();
			}

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
						else {
							if (info.error.message) {
								msg = info.error.message;
							}
						}
					}
					return res.json(req.soajs.buildResponse({"code": info.code || 900, "msg": msg}));
				}
			}
			else {
				return res.json(req.soajs.buildResponse(null, info.data));
			}
		};
	},

	"loadAndInjectModel": function (context, serviceName) {
		return function (req, res, next) {
			req.soajs.config = utils.cloneObj(context[serviceName].config);

			var modelPath = context[serviceName].config.models.path;
			var modelName = (req.soajs.servicesConfig && req.soajs.servicesConfig.model) ? req.soajs.servicesConfig.model : req.soajs.config.models.name;
			if (process.env.SOAJS_TEST && req.soajs.inputmaskData.model) {
				modelName = req.soajs.inputmaskData.model;
			}
			modelPath += modelName + ".js";
			
			return lib.requireModel(modelPath, function (error, modelInstance) {
				if (error) {
					return res.json(req.soajs.buildResponse(error));
				}
				
				wrapModel(modelInstance);
				req.soajs.model = modelInstance;
				req.soajs.model.initConnections(req, res, function () {
					next();
				});
			});

			function wrapModel(modelInstance) {

				modelInstance.initConnections = function (req, res, callback) {
					var count = 0;
					var oldConnections = 0;
					if (context[serviceName][modelName]) {
						oldConnections = Object.keys(context[serviceName][modelName]).length;
						context[serviceName].config.dbs.forEach(function(oneDB){
							if(oneDB[modelName]){
								count++;
							}
						});
					}
					
					if(oldConnections > 0 && oldConnections === count){
						req.soajs[modelName] = context[serviceName][modelName];
						return callback(null, true);
					}
					else {
						context[serviceName][modelName] = {};
						async.each(context[serviceName].config.dbs, buildDBConnection, function (error) {
							if (error) {
								req.soajs.log.error(error);
								return res.json(req.soajs.buildResponse({code: 400, msg: error}));
							}
							req.soajs[modelName] = context[serviceName][modelName];
							return callback(null, true);
						});
					}
				};

				modelInstance.closeConnections = function () {
					context[serviceName].config.dbs.forEach(function (oneDB) {
						lib.cleanupConnection2(oneDB, context, serviceName, modelName, req);
					});
				};
			}

			function buildDBConnection(oneDB, cb) {
				if (oneDB[modelName]) {
					lib.createConnections(oneDB, context[serviceName], modelName, req, cb);
				}
				else return cb(null, true);
			}
		};
	}
};

var service = {
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
			if (method === 'commonFields') {
				continue;
			}
			else if (methods.indexOf(method.toLowerCase()) !== -1) {
				method = method.toLowerCase();
				for (var api in config.schema[method]) {
					validateAPI(config.schema[method][api]);
				}
			}
			//backward compatible
			else {
				validateAPI(config.schema[method]);
			}
		}

		function validateAPI(api) {
			if (!api._apiInfo || typeof(api._apiInfo) !== 'object' || !api._apiInfo.l) {
				throw new Error(_config.errors[411].replace("%api%", method));
			}

			if (!api.mw) {
				throw new Error(_config.errors[412].replace("%api%", method));
			}

			//mw can either be an object or a string representing a filepath
			if (typeof(api.mw) === 'string') {
				if (!fs.existsSync(api.mw)) {
					throw new Error(_config.errors[412].replace("%api%", method));
				}
			}
			else if (typeof(api.mw) === 'object') {
				if (Object.keys(api.mw).length === 0) {
					throw new Error(_config.errors[412].replace("%api%", method));
				}
			}
			else {
				//invalid mw given
				throw new Error(_config.errors[412].replace("%api%", method));
			}
		}
	},

	generateService: function (context, serviceName, composer, cb) {
		//initialize workflow
		var __composerInit = function (req, res, next) {
			//add a reference to soajs utils
			req.soajs.utils = utils;

			//clone the config obj and hook it
			req.soajs.config = utils.cloneObj(context[serviceName].config);

			//hooking up a new wrapper for res.json that terminates mt db connections
			if (!res.soajs) {
				res.soajs = {};
			}

			res.soajs.returnAPIResponse = lib.injectComposerResponse(context, serviceName);

			async.each(context[serviceName].config.dbs, buildDBConnection, function (error) {
				if (error) {
					req.soajs.log.error(error);
					return res.json(req.soajs.buildResponse({code: 400, msg: error}));
				}

				if (context[serviceName].mongo && Object.keys(context[serviceName].mongo).length > 0) {
					req.soajs.mongo = context[serviceName].mongo;
				}

				if (context[serviceName].es && Object.keys(context[serviceName].es).length > 0) {
					req.soajs.es = context[serviceName].es;
				}

				delete req.soajs.config.schema;
				delete req.soajs.config.type;
				delete req.soajs.config.dbs;
				next();
			});

			function buildDBConnection(oneDB, cb) {
				if (context[serviceName].injection) {
					return cb(null, true);
				}
				lib.createConnections(oneDB, context[serviceName], null, req, cb);
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
			for (var oneApiName in serviceAPIs) {
				var oneApi = serviceAPIs[oneApiName];
				var workflow = {};

				workflow['__composerInit'] = __composerInit;
				for (var state in oneApi.mw) {
					workflow[state] = oneApi.mw[state];
				}

				oneApi.wf = [];
				//push workflow steps as api middlewares
				for (var step in workflow) {
					oneApi.wf.push(workflow[step]);
				}
			}
			return cb(null, true);
		}
	},

	renderServiceConfig: function (context, serviceName) {
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
				for (var api in context[serviceName].config.schema[method]) {
					context[serviceName].serviceAPIs[method][api] = {};
					var combo = lib.renderOneAPI(context[serviceName].config.schema[method][api], context[serviceName].serviceAPIs[method][api], true);
					context[serviceName].serviceAPIs[method][api] = combo[1];
					context[serviceName].config.schema[method][api] = combo[0];
				}
			}
			else {
				context[serviceName].newStyle = false;
				var combo = lib.renderOneAPI(context[serviceName].config.schema[method], context[serviceName].serviceAPIs[method], false);
				context[serviceName].serviceAPIs[method] = combo[1];
				context[serviceName].config.schema[method] = combo[0];
			}
		}
	},

	buildRunService: function (context, serviceName, cb) {
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

			if (context[serviceName].newStyle) {
				async.forEachOf(context[serviceName].serviceAPIs, function (apis, method, callback) {
					method = method.toLowerCase();
					method = (method === 'del') ? 'delete' : method;
					async.forEachOf(apis, function (oneAPI, route, iCb) {
						if (context[serviceName].injection) {
							oneAPI.wf.unshift(lib.loadAndInjectModel(context, serviceName));
						}

						context[serviceName].service[method](route, oneAPI.wf);
						return iCb(null, true);
					}, callback);
				}, function () {
					context[serviceName].service.start(cb);
				});
			}
			else {
				//generate the service apis
				async.forEachOf(context[serviceName].serviceAPIs, function (oneAPI, apiName, callback) {
					var method = oneAPI.method.toLowerCase();
					method = (method === 'del') ? 'delete' : method;
					context[serviceName].service[method](apiName, oneAPI.wf);
					return callback(null, true);
				}, function () {
					context[serviceName].service.start(cb);
				});
			}
		});
	}
};

module.exports = service;