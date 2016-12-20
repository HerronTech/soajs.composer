"use strict";

module.exports = {
	"type": "service",
	"dbs": [
		{
			prefix: "test_",
			name: "myDatabase",
			multitenant: false
		},
		{
			"prefix": "test_",
			name: "urac",
			multitenant: true
		},
		{
			"prefix": "test_",
			name: "esClient",
			es: true
		}
	],

	"prerequisites": {
		"cpu": '',
		"memory": ''
	},
	"serviceName": "dummy",
	"serviceGroup": "dummy",
	"serviceVersion": 1,
	"servicePort": 4060,
	"requestTimeout": 30,
	"requestTimeoutRenewal": 5,
	"extKeyRequired": true,
	"session": true,
	"oauth": false,
	"errors": {
		400: "Error Connecting to Database"
	},
	"schema": {
		"commonFields": {
			"id": {
				"source": ['query.id', 'body.id'],
				"required": true,
				"validation": {"type": "string"}
			},
			"start": {
				"required": false,
				"source": ["body.start"],
				"default": 1,
				"validation":{
					"type": "number"
				}
			}
		},

		"/list": {
			"method": "POST",
			"_apiInfo": {
				"l": "List Entries",
				"group": "Entries",
				"groupMain": true
			},
			"mw": __dirname + "/lib/mw/list.js",
			"imfv": {
				"commonFields": ["start"],
				"custom": {
					"deleted": {
						"required": false,
						"source": ["body.deleted"],
						"validation": {
							"type": "boolean"
						}
					}
				}
			}
		},
		"/delete": {
			"method": "GET",
			"_apiInfo": {
				"l": "Delete Entry",
				"group": "Entries"
			},
			"mw": __dirname + "/lib/mw/delete.js"
		},

		"/get": {
			"method": "GET",
			"_apiInfo": {
				"l": "Get Entry",
				"group": "Entries"
			},
			"mw": __dirname + "/lib/mw/get.js",
			"imfv": {
				"commonFields": __dirname + "/lib/schemas/imfv.js"
			}
		},

		"/push": {
			"method": "POST",
			"_apiInfo": {
				"l": "Add/Update Entry",
				"group": "Entries"
			},
			"mw": __dirname + "/lib/mw/push.js",
			"imfv": {
				"custom": __dirname + "/lib/schemas/index.js"
			}
		}
	}
};