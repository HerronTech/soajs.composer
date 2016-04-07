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
	"servicePort": 4070,
	"dbs": [
		{
			prefix: prefix,
			name: "myDatabase",
			multitenant: false
		},
	],
	"schema": {
		"commonFields": "invalid"
	}
};