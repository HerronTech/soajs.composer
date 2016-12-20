"use strict";

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
			prefix: "test_",
			name: "myDatabase",
			multitenant: false
		},
	]
};