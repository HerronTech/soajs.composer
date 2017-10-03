"use strict";
var assert = require("assert");
var helper = require("../helper");
var composer = helper.requireModule("index");

describe("testing composer", function () {
	
	describe("testing services", function () {
		afterEach(function (done) {
			setTimeout(function () {
				console.log("------");
				done();
			}, 100);
		});
		
		it("success, should deploy service1", function (done) {
			composer.deploy(__dirname + "/../data/service.test.js", function (error) {
				var x = composer.getService("dummy");
				
				composer.stopService('dummy', function () {
					assert.ifError(error);
					done();
				});
				
			});
		});
		
		
		it("success, should deploy service2", function (done) {
			composer.deploy(__dirname + "/../data/service2.test.js", function (error) {
				
				composer.stopService('dummy', function () {
					assert.ifError(error);
					done();
				});
				
			});
		});
		
		it("success, should deploy service3", function (done) {
			composer.deploy(__dirname + "/../data/service3.test.js", function (error) {
				
				// composer.stopService('dummy', function () {
				assert.ifError(error);
				done();
				// });
				
			});
		});
		
		it("success - call service get api", function (done) {
			var params = {
				uri: 'http://localhost:4000/dummy/',
				headers: {
					'Content-Type': 'application/json',
					'key': helper.getKey()
				},
				json: true,
				"qs": {
					"model": "es"
				}
			};
			helper.requester("get", params, function (error, body) {
				assert.ifError(error);
				assert.ok(body);
				done();
			});
		});
		
		it("success - call service get api reuse connections", function (done) {
			var params = {
				uri: 'http://localhost:4000/dummy/',
				headers: {
					'Content-Type': 'application/json',
					'key': helper.getKey()
				},
				json: true
			};
			helper.requester("get", params, function (error, body) {
				assert.ifError(error);
				assert.ok(body);
				done();
			});
		});
		
		it("success - call service get api create es connection", function (done) {
			var params = {
				uri: 'http://localhost:4000/dummy/',
				headers: {
					'Content-Type': 'application/json',
					'key': helper.getKey()
				},
				json: true,
				qs: {
					model: 'es'
				}
			};
			helper.requester("get", params, function (error, body) {
				assert.ifError(error);
				assert.ok(body);
				done();
			});
		});
		
		it("success - call service get api reuse es connection", function (done) {
			var params = {
				uri: 'http://localhost:4000/dummy/',
				headers: {
					'Content-Type': 'application/json',
					'key': helper.getKey()
				},
				json: true,
				qs: {
					model: 'es'
				}
			};
			helper.requester("get", params, function (error, body) {
				assert.ifError(error);
				assert.ok(body);
				done();
			});
		});
		
		it("success - gets service schema", function (done) {
			var params = {
				uri: 'http://localhost:4000/dummy/schema',
				headers: {
					'Content-Type': 'application/json',
					'key': helper.getKey()
				},
				json: true
			};
			helper.requester("get", params, function (error, body) {
				assert.ifError(error);
				assert.ok(body);
				done();
				
			});
		});
		
		it("success, should stop service3", function (done) {
			composer.stopService('dummy', function (error) {
				assert.ifError(error);
				done();
			});
		});
		
		it("success, should deploy service4", function (done) {
			composer.deploy(__dirname + "/../data/service4.test.js", function (error) {
				
				assert.ifError(error);
				done();
				
			});
		});
		
		it("success - calls /get (old style service) route", function (done) {
			var params = {
				uri: 'http://localhost:4000/dummy/get',
				headers: {
					'Content-Type': 'application/json',
					'key': helper.getKey()
				},
				json: true
			};
			helper.requester("get", params, function (error, body) {
				assert.ifError(error);
				assert.ok(body);
				done();
				
			});
		});
		
		it("success - call service get (old style) api create es connection", function (done) {
			var params = {
				uri: 'http://localhost:4000/dummy/get',
				headers: {
					'Content-Type': 'application/json',
					'key': helper.getKey()
				},
				json: true,
				qs: {
					model: 'es'
				}
			};
			helper.requester("get", params, function (error, body) {
				assert.ifError(error);
				assert.ok(body);
				done();
			});
		});
		
		it("success - call service get (old style) api reuse es connection", function (done) {
			var params = {
				uri: 'http://localhost:4000/dummy/get',
				headers: {
					'Content-Type': 'application/json',
					'key': helper.getKey()
				},
				json: true,
				qs: {
					model: 'es'
				}
			};
			helper.requester("get", params, function (error, body) {
				assert.ifError(error);
				assert.ok(body);
				done();
			});
		});
		
		it("success - call service get with mw info false", function (done) {
			var params = {
				uri: 'http://localhost:4000/dummy/gettwo',
				headers: {
					'Content-Type': 'application/json',
					'key': helper.getKey()
				},
				json: true
			};
			helper.requester("get", params, function (error, body) {
				assert.ifError(error);
				assert.ok(body);
				done();
			});
		});
		
		it("success - call service get with mw info.error", function (done) {
			var params = {
				uri: 'http://localhost:4000/dummy/getthree',
				headers: {
					'Content-Type': 'application/json',
					'key': helper.getKey()
				},
				json: true
			};
			helper.requester("get", params, function (error, body) {
				assert.ifError(error);
				assert.ok(body);
				done();
			});
		});
		
		it("success - call service get with mw info.error as an array", function (done) {
			var params = {
				uri: 'http://localhost:4000/dummy/getfour',
				headers: {
					'Content-Type': 'application/json',
					'key': helper.getKey()
				},
				json: true
			};
			helper.requester("get", params, function (error, body) {
				assert.ifError(error);
				assert.ok(body);
				done();
			});
		});
		
		it("success, should stop service4", function (done) {
			composer.stopService('dummy', function (error) {
				assert.ifError(error);
				done();
			});
		});
	});
	
	describe("invalid configuration tests", function () {
		
		it("fail, config is empty", function (done) {
			composer.deploy(__dirname + "/../data/invalid1.service.test.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, config has no service name", function (done) {
			composer.deploy(__dirname + "/../data/invalid2.service.test.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, config has no group name", function (done) {
			composer.deploy(__dirname + "/../data/invalid3.service.test.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, config has no dbs", function (done) {
			composer.deploy(__dirname + "/../data/invalid4.service.test.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, config has no port", function (done) {
			composer.deploy(__dirname + "/../data/invalid5.service.test.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, config has no api", function (done) {
			composer.deploy(__dirname + "/../data/invalid6.service.test.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, invalid commonFields 1", function (done) {
			composer.deploy(__dirname + "/../data/invalid7.service.test.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, invalid commonFields 2", function (done) {
			composer.deploy(__dirname + "/../data/invalid8.service.test.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, invalid commonFields 3", function (done) {
			composer.deploy(__dirname + "/../data/invalid9.service.test.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, invalid no apiInfo", function (done) {
			composer.deploy(__dirname + "/../data/invalid10.service.test.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, invalid no mw", function (done) {
			composer.deploy(__dirname + "/../data/invalid11.service.test.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, invalid mw 1", function (done) {
			composer.deploy(__dirname + "/../data/invalid12.service.test.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, invalid mw 2", function (done) {
			composer.deploy(__dirname + "/../data/invalid13.service.test.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, invalid mw 3", function (done) {
			composer.deploy(__dirname + "/../data/invalid14.service.test.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, no model", function (done) {
			composer.deploy(__dirname + "/../data/invalid15.service.test.js", function (error) {
				assert.ok(error);
				done();
			});
		});
	});
	
	describe("testing daemons", function () {
		afterEach(function (done) {
			setTimeout(function () {
				console.log("------");
				done();
			}, 1000);
			
		});
		
		it("success, should deploy daemon1 (with model injection)", function (done) {
			composer.deploy(__dirname + "/../data/daemon.test.js", function (error) {
				
				assert.ifError(error);
				done();
				
			});
		});
		
		it("success, should stop daemon1", function (done) {
			composer.stopDaemon('aggregator', function (error) {
				assert.ifError(error);
				done();
			});
		});
		it("success, should deploy daemon3 (es keepAlive false)", function (done) {
			composer.deploy(__dirname + "/../data/daemon.test3.js", function (error) {
				var x = composer.getDaemon("aggregator");
				
				assert.ifError(error);
				done();
				
			});
		});
		
		it("success, should stop daemon", function (done) {
			composer.stopDaemon('aggregator', function (error) {
				assert.ifError(error);
				done();
			});
		});
		
		it("success, should deploy daemon2 (without model injection)", function (done) {
			composer.deploy(__dirname + "/../data/daemon.test2.js", function (error) {
				
				assert.ifError(error);
				done();
				
			});
		});
		
		it("success, should stop daemon2", function (done) {
			composer.stopDaemon('aggregator', function (error) {
				assert.ifError(error);
				done();
			});
		});
		
		it("success, should deploy daemon4 (multiltenant mongo)", function (done) {
			process.env.SOAJS_DAEMON_GRP_CONF = "tormoss";
			console.log("*********************************")
			composer.deploy(__dirname + "/../data/daemon.test4.js", function (error) {
				assert.ifError(error);
				
				setTimeout(function(){
					done();
				}, 150);
				
			});
		});
		
		it("success, should stop daemon4", function (done) {
			composer.stopDaemon('aggregator', function (error) {
				assert.ifError(error);
				done();
			});
		});
		
	});
	
	describe("invalid daemon tests", function(){
		it("fail, empty mw", function (done) {
			composer.deploy(__dirname + "/../data/invalid1.daemon.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, no daemon name", function (done) {
			composer.deploy(__dirname + "/../data/invalid2.daemon.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, no daemon group name", function (done) {
			composer.deploy(__dirname + "/../data/invalid3.daemon.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, no daemon port", function (done) {
			composer.deploy(__dirname + "/../data/invalid4.daemon.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, no schema", function (done) {
			composer.deploy(__dirname + "/../data/invalid5.daemon.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, no config", function (done) {
			composer.deploy(__dirname + "/../data/invalid7.daemon.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, no model", function (done) {
			composer.deploy(__dirname + "/../data/invalid8.daemon.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, no apiInfo", function (done) {
			composer.deploy(__dirname + "/../data/invalid9.daemon.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, no mw object", function (done) {
			composer.deploy(__dirname + "/../data/invalid10.daemon.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, no mw file exists", function (done) {
			composer.deploy(__dirname + "/../data/invalid11.daemon.js", function (error) {
				assert.ok(error);
				done();
			});
		});
		
		it("fail, mw is not of type string or object", function (done) {
			composer.deploy(__dirname + "/../data/invalid12.daemon.js", function (error) {
				assert.ok(error);
				done();
			});
		});
	});
});