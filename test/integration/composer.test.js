"use strict";
var assert = require("assert");
var helper = require("../helper");
// var daemons = require("../data/daemon.test.js");
var services = require("../data/service.test.js");
var composer = helper.requireModule("index");

describe("testing composer", function(){

	describe("testing services", function(){
		it.skip("success, should deploy service1", function(done){
			// console.log(JSON.stringify(services, null, 2));
			composer.deploy(__dirname + "/../data/service.test.js", function(error){
				assert.ifError(error);
				done();
			});
		});

		it.skip("success, should deploy service2", function(done){
			// console.log(JSON.stringify(services, null, 2));
			composer.deploy(__dirname + "/../data/service2.test.js", function(error){
				assert.ifError(error);
				done();
			});
		});

		it("success, should deploy service3", function(done){
			// console.log(JSON.stringify(services, null, 2));
			composer.deploy(__dirname + "/../data/service3.test.js", function(error){
				assert.ifError(error);
				process.exit();
			});
		});


		// it("success - call service get schema", function(done){
		// 	var params = {
		// 		uri: 'http://localhost:4060/schema',
		// 		headers: {
		// 			'Content-Type': 'application/json',
		// 			'key' : helper.getKey()
		// 		},
		// 		json: true
		// 	};
		// 	helper.requester("get", params, function(error, body){
		// 		assert.ifError(error);
		// 		assert.ok(body);
		// 		done();
		// 	});
		// });
		//
		// it("success - call service apis get ", function(done){
		// 	var params = {
		// 		uri: 'http://localhost:4060/get',
		// 		headers: {
		// 			'Content-Type': 'application/json',
		// 			'key' : helper.getKey()
		// 		},
		// 		qs:{
		// 			"id": "123"
		// 		},
		// 		json: true
		// 	};
		// 	helper.requester("get", params, function(error, body){
		// 		assert.ifError(error);
		// 		assert.ok(body);
		// 		done();
		// 	});
		// });
		//
		// it("success - call service apis get", function(done){
		// 	var params = {
		// 		uri: 'http://localhost:4060/get',
		// 		headers: {
		// 			'Content-Type': 'application/json',
		// 			'key': helper.getKey()
		// 		},
		// 		qs:{
		// 			"id": "123"
		// 		},
		// 		json: true
		// 	};
		// 	helper.requester("get", params, function(error, body){
		// 		assert.ifError(error);
		// 		assert.ok(body);
		// 		done();
		// 	});
		// });
		//
		// it("success - call service apis list", function(done){
		// 	var params = {
		// 		uri: 'http://localhost:4060/list',
		// 		headers: {
		// 			'Content-Type': 'application/json',
		// 			'key': helper.getKey()
		// 		},
		// 		json: true
		// 	};
		// 	helper.requester("post", params, function(error, body){
		// 		assert.ifError(error);
		// 		assert.ok(body);
		// 		done();
		// 	});
		// });
		//
		// it("success - call service apis list", function(done){
		// 	var params = {
		// 		uri: 'http://localhost:4060/delete',
		// 		headers: {
		// 			'Content-Type': 'application/json',
		// 			'key': helper.getKey()
		// 		},
		// 		json: true
		// 	};
		// 	helper.requester("get", params, function(error, body){
		// 		assert.ifError(error);
		// 		assert.ok(body);
		// 		console.log(JSON.stringify(body));
		// 		done();
		// 	});
		// });
		//
		// it("fail, config is empty", function(done){
		// 	composer.deploy(__dirname + "/../data/invalid1.service.test.js", function(error){
		// 		assert.ok(error);
		// 		done();
		// 	});
		// });
		//
		// it("fail, config has no service name", function(done){
		// 	composer.deploy(__dirname + "/../data/invalid2.service.test.js", function(error){
		// 		assert.ok(error);
		// 		done();
		// 	});
		// });
		//
		// it("fail, config has no group name", function(done){
		// 	composer.deploy(__dirname + "/../data/invalid3.service.test.js", function(error){
		// 		assert.ok(error);
		// 		done();
		// 	});
		// });
		//
		// it("fail, config has no dbs", function(done){
		// 	composer.deploy(__dirname + "/../data/invalid4.service.test.js", function(error){
		// 		assert.ok(error);
		// 		done();
		// 	});
		// });
		//
		// it("fail, config has no port", function(done){
		// 	composer.deploy(__dirname + "/../data/invalid5.service.test.js", function(error){
		// 		assert.ok(error);
		// 		done();
		// 	});
		// });
		//
		// it("fail, config has no api", function(done){
		// 	composer.deploy(__dirname + "/../data/invalid6.service.test.js", function(error){
		// 		assert.ok(error);
		// 		done();
		// 	});
		// });
		//
		// it("fail, invalid commonFields 1", function(done){
		// 	composer.deploy(__dirname + "/../data/invalid7.service.test.js", function(error){
		// 		assert.ok(error);
		// 		done();
		// 	});
		// });
		//
		// it("fail, invalid commonFields 2", function(done){
		// 	composer.deploy(__dirname + "/../data/invalid8.service.test.js", function(error){
		// 		assert.ok(error);
		// 		done();
		// 	});
		// });
		//
		// it("fail, invalid commonFields 3", function(done){
		// 	composer.deploy(__dirname + "/../data/invalid9.service.test.js", function(error){
		// 		assert.ok(error);
		// 		done();
		// 	});
		// });
		//
		// it("fail, invalid no apiInfo", function(done){
		// 	composer.deploy(__dirname + "/../data/invalid10.service.test.js", function(error){
		// 		assert.ok(error);
		// 		done();
		// 	});
		// });
		//
		// it("fail, invalid no mw", function(done){
		// 	composer.deploy(__dirname + "/../data/invalid11.service.test.js", function(error){
		// 		assert.ok(error);
		// 		done();
		// 	});
		// });
		//
		// it("fail, invalid mw 1", function(done){
		// 	composer.deploy(__dirname + "/../data/invalid12.service.test.js", function(error){
		// 		assert.ok(error);
		// 		done();
		// 	});
		// });
		//
		// it("fail, invalid mw 2", function(done){
		// 	composer.deploy(__dirname + "/../data/invalid13.service.test.js", function(error){
		// 		assert.ok(error);
		// 		done();
		// 	});
		// });
		//
		// it("fail, invalid mw 3", function(done){
		// 	composer.deploy(__dirname + "/../data/invalid14.service.test.js", function(error){
		// 		assert.ok(error);
		// 		done();
		// 	});
		// });
	});

	// describe("testing daemons", function(){
	//
	// });
});