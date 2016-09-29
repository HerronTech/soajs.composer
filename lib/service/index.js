"use strict";

var fs = require("fs");
var soajs = require("soajs");
var _config = require("../../config");
var async = require("async");
var utils = require("soajs/lib/utils");
var methods = ['post', 'put', 'get', 'delete'];

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
			if (method === 'commonFields') {
				continue;
			}
			else if (methods.indexOf(method.toLowerCase()) !== -1) {
				method = method.toLowerCase();
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

	injectComposerResponse: function(context, serviceName){
		return function (req, res, info) {
			if(!context[serviceName].injection) {
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
			}
			else{
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
							msg = info.error.message;
						}
					}
					return res.json(req.soajs.buildResponse({ "code": info.code || 900, "msg": msg }));
				}
			}
			else {
				return res.json(req.soajs.buildResponse(null, info.data));
			}
		};
	},

	loadAndInjectModel: function(context, serviceName){
		return function(req, res, next){
			if(!req.soajs.config){
				req.soajs.config = utils.cloneObj(context[serviceName].config);
			}

			var modelPath = context[serviceName].config.modelPath;
			var modelName = req.soajs.servicesConfig.model || req.soajs.config.model;
			if(process.env.SOAJS_TEST && req.soajs.inputmaskData.model){
				modelName = req.soajs.inputmaskData.model;
			}
			modelPath += modelName + ".js";

			return requireModel(modelPath, function(error, modelInstance){
				if(error){
					return res.json(req.soajs.buildResponse(error));
				}

				wrapModel(modelInstance, modelName);
				req.soajs.model = modelInstance;
				next();
			});

			/**
			 * checks if model file exists, requires it and returns it.
			 * @param filePath
			 * @param cb
			 */
			function requireModel(filePath, cb) {
				//check if file exist. if not return error
				fs.exists(filePath, function (exists) {
					if (!exists) {
						return cb(new Error("Requested Model Not Found!"));
					}
					return cb(null, require(filePath));
				});
			}

			function wrapModel(modelInstance, modelName){

				modelInstance.initConnections = function(req, res, callback){
					if(!context[serviceName][modelName]){
						context[serviceName][modelName] = {};
					}

					async.each(context[serviceName].config.dbs, function(oneDB, cb){
						if(oneDB[modelName]){
							var dbName = oneDB.name;
							if (oneDB.es) {
								if (!context[serviceName][modelName][dbName] || !context[serviceName][modelName][dbName].config.extraParam.keepAlive) {
									var dbConfiguration = req.soajs.registry.coreDB[oneDB.name];
									dbConfiguration.prefix = oneDB.prefix;
									context[serviceName][modelName][dbName] = new soajs.es(dbConfiguration);
									req.soajs.log.debug("creating connection for: ", dbName);
								}
								else {
									req.soajs.log.debug("reusing connection for: ", dbName);
								}
							}
							else if (!oneDB.multitenant) {
								if (!context[serviceName][modelName][dbName]) {
									var dbConfiguration = req.soajs.registry.coreDB[oneDB.name];
									dbConfiguration.prefix = oneDB.prefix;
									context[serviceName][modelName][dbName] = new soajs.mongo(dbConfiguration);
									req.soajs.log.debug("creating connection for: ", dbName);
								}
								else {
									req.soajs.log.debug("reusing connection of: ", dbName);
								}
							}
							else {
								var dbConfig = req.soajs.meta.tenantDB(req.soajs.registry.tenantMetaDB, oneDB.name, req.soajs.tenant.code);
								dbConfig.prefix = oneDB.prefix;
								context[serviceName][modelName][dbName] = new soajs.mongo(dbConfig);
								req.soajs.log.debug("creating connection for: ", dbName);
							}
						}

						return cb(null, true);
					},function(error){
						if (error) {
							req.soajs.log.error(error);
							return res.json(req.soajs.buildResponse({code: 400, msg: error}));
						}
						req.soajs[modelName] = context[serviceName][modelName];
						return callback(null, true);
					});
				};

				modelInstance.closeConnections = function(){
					context[serviceName].config.dbs.forEach(function (oneDB) {
						if(oneDB[modelName]){
							var dbName = oneDB.name;

							if (oneDB.es && !req.soajs[modelName][dbName].config.extraParam.keepAlive) {
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
					});
				};
			}
		};
	},

	generateService: function (context, serviceName, composer, cb) {

		//initialize workflow
		var __composerInit = function (req, res, next) {
			//add a reference to soajs.mongo
			req.soajs.mongo = {};

			//add a reference to soajs utils
			req.soajs.utils = utils;

			//clone the config obj and hook it
			if(!req.soajs.config){
				req.soajs.config = utils.cloneObj(context[serviceName].config);
			}

			//hooking up a new wrapper for res.json that terminates mt db connections
			if (!res.soajs) {
				res.soajs = {};
			}

			res.soajs.returnAPIResponse = service.injectComposerResponse(context, serviceName);

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

				delete req.soajs.config.schema;
				delete req.soajs.config.type;
				delete req.soajs.config.dbs;

				next();
			});

			function buildDBConnection(oneDB, cb) {
				if(context[serviceName].injection){
					return cb(null, true);
				}
				var dbName = oneDB.name;
				if (oneDB.es) {
					if (!context[serviceName].es[dbName]) {
						context[serviceName].es[dbName] = {};
					}
					var dbConfiguration = req.soajs.registry.coreDB[oneDB.name];
					dbConfiguration.prefix = oneDB.prefix;
					context[serviceName].es[dbName] = new soajs.es(dbConfiguration);
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
				}
				else {
					var dbConfig = req.soajs.meta.tenantDB(req.soajs.registry.tenantMetaDB, oneDB.name, req.soajs.tenant.code);
					dbConfig.prefix = oneDB.prefix;
					context[serviceName].dbs[dbName] = new soajs.mongo(dbConfig);
					req.soajs.log.debug("creating connection for: ", dbName);
				}
				return cb(null, true);
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
				context[serviceName].serviceAPIs[method][api] ={
					model: context[serviceName].config.schema[method][api].model,
					mw: require(context[serviceName].config.schema[method][api].mw)
				};

				delete context[serviceName].config.schema[method][api].mw;
				delete context[serviceName].config.schema[method][api].imfv;
				delete context[serviceName].config.schema[method][api].model;
			}
		}

		function renderOldStyle(apiName) {
			var value = context[serviceName].config.schema[apiName];

			if (value.imfv && value.imfv.commonFields) {
				if (typeof(value.imfv.commonFields) === 'string') {
					value.imfv.commonFields = require(value.imfv.commonFields);
				}

				if (Array.isArray(value.imfv.commonFields) && value.imfv.commonFields.length > 0) {
					context[serviceName].config.schema[apiName].commonFields = utils.cloneObj(value.imfv.commonFields);
				}
			}

			if (value.imfv && value.imfv.custom) {
				if (typeof(value.imfv.custom) === 'string') {
					value.imfv.custom = require(value.imfv.custom);
				}

				if (typeof(value.imfv.custom) === 'object' && Object.keys(value.imfv.custom).length > 0) {
					for (var field in value.imfv.custom) {
						context[serviceName].config.schema[apiName][field] = utils.cloneObj(value.imfv.custom[field]);
					}
				}
			}

			context[serviceName].config.schema[apiName].mw = require(context[serviceName].config.schema[apiName].mw);
			context[serviceName].serviceAPIs[apiName].method = context[serviceName].config.schema[apiName].method;
			context[serviceName].serviceAPIs[apiName]._apiInfo = context[serviceName].config.schema[apiName]._apiInfo;
			context[serviceName].serviceAPIs[apiName].mw = utils.cloneObj(context[serviceName].config.schema[apiName].mw);

			delete context[serviceName].config.schema[apiName].method;
			delete context[serviceName].config.schema[apiName].mw;
			delete context[serviceName].config.schema[apiName].imfv;
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

			if(context[serviceName].newStyle){
				async.forEachOf(context[serviceName].serviceAPIs, function(apis, method, callback){
					method = method.toLowerCase();
					method = (method === 'del') ? 'delete' : method;
					async.forEachOf(apis, function(oneAPI, route, iCb){
						if(context[serviceName].injection){
							oneAPI.wf.unshift(service.loadAndInjectModel(context, serviceName));
						}

						context[serviceName].service[method](route, oneAPI.wf);
						return iCb(null, true);
					}, callback);
				}, function(){
					context[serviceName].service.start(cb);
				});
			}
			else{
				//generate the service apis
				async.forEachOf(context[serviceName].serviceAPIs, function(oneAPI, apiName, callback){
					var method = oneAPI.method.toLowerCase();
					method = (method === 'del') ? 'delete' : method;
					context[serviceName].service[method](apiName, oneAPI.wf);
					return callback(null, true);
				}, function(error, response){
					if(error){
						return cb(error);
					}
					context[serviceName].service.start(cb);
				});
			}
		});
	}
};

module.exports = service;