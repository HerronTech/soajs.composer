"use strict";
var prefix = "test_";
module.exports = {
	"type": "service",
	"prerequisites": {
		"cpu": '',
		"memory": ''
	},
	"serviceName": "tester",
	"serviceGroup": "tester",
	"dbs": [
		{
			prefix: prefix,
			name: "myDatabase",
			multitenant: false
		},
	]
};