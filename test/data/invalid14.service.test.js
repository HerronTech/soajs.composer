"use strict";

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
			prefix: "test_",
			name: "myDatabase",
			multitenant: false
		},
	],
	"schema": {
		"/api":{
			"_apiInfo":{
				"l": "my Api"
			},
			"mw": true
		},
	}
};