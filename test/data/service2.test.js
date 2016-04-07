"use strict";
var prefix = "test_";
module.exports = {
	"type": "service",
	"dbs": [
		{
			prefix: prefix,
			name: "myDatabase",
			multitenant: false
		}
	],

	"prerequisites": {
		"cpu": '',
		"memory": ''
	},
	"serviceName": "dummy2",
	"serviceGroup": "dummy",
	"serviceVersion": 1,
	"servicePort": 4080,
	"requestTimeout": 30,
	"requestTimeoutRenewal": 5,
	"extKeyRequired": true,
	"session": true,
	"oauth": false,
	"errors": {
		400: "Error Connecting to Database"
	},
	"schema": {
		"commonFields": __dirname + "/lib/schemas/imfv.js",

		"/list": {
			"method": "POST",
			"_apiInfo": {
				"l": "List Entries",
				"group": "Entries",
				"groupMain": true
			},
			"mw": __dirname + "/lib/mw/list.js",
			"imfv": {
				"commonFields": ["start", "limit"],
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
		}
	}
};