"use strict";

module.exports = {
	"type": "service",
	"dbs": [
		{
			prefix: "test_",
			name: "myDatabase",
			multitenant: false
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