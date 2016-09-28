"use strict";
var prefix = "test_";
module.exports = {
	"type": "service",
	"dbs": [
		{
			prefix: prefix,
			name: "myDatabase",
			multitenant: false
		},
		{
			prefix: prefix,
			name: "myDatabase2",
			multitenant: false
		}
	],

	"prerequisites": {
		"cpu": '',
		"memory": ''
	},
	"serviceName": "dummy3",
	"serviceGroup": "dummy",
	"serviceVersion": 1,
	"servicePort": 4081,
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

		"get":{
			"/": {
				"_apiInfo": {
					"l": "List Entries",
					"group": "Entries",
					"groupMain": true
				},
				"mw": __dirname + "/lib/mw/list.js",
				"imfv": {
					"commonFields": ["start", "limit"]
				},
				"model":"*"
			},
			"/:id": {
				"_apiInfo": {
					"l": "Get One Entry",
					"group": "Entries"
				},
				"mw": __dirname + "/lib/mw/get.js",
				"imfv": {
					"commonFields": ["id"]
				},
				"model":"*"
			}
		},
		"post":{
			"/": {
				"_apiInfo": {
					"l": "Add Entry",
					"group": "Entries"
				},
				"mw": __dirname + "/lib/mw/push.js",
				"imfv": {
					"custom": __dirname + "/lib/schemas/index.js"
				},
				"model":"*"
			}
		},
		"put":{
			"/:id": {
				"_apiInfo": {
					"l": "Edit Entry",
					"group": "Entries"
				},
				"mw": __dirname + "/lib/mw/push.js",
				"imfv": {
					"commonFields": ["id"],
					"custom": __dirname + "/lib/schemas/index.js"
				},
				"model":"*"
			}
		},
		"delete":{
			"/:id": {
				"_apiInfo": {
					"l": "Delete Entry",
					"group": "Entries"
				},
				"mw": __dirname + "/lib/mw/delete.js",
				"imfv": {
					"commonFields": ["id"]
				},
				"model":"*"
			}
		}
	}
};