"use strict";
module.exports = {
	"type": "service",
	"dbs": [
		{
			prefix: "test_",
			name: "myDatabase",
			multitenant: false,
			mongo: true
		},
		{
			prefix: "test_",
			name: "myDatabase2",
			multitenant: true,
			mongo: true
		},
		{
			prefix: "test_",
			name: "esClient",
			es: true
		}
	],
	"models":{
		"path": __dirname + "/lib/model/",
		"name": "mongo"
	},
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
	"injection": true,
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
				"mw": __dirname + "/lib/mw/list2.js",
				"imfv": {
					"commonFields": ["start", "limit", "model"]
				}
			},
			"/:id": {
				"_apiInfo": {
					"l": "Get One Entry",
					"group": "Entries"
				},
				"mw": __dirname + "/lib/mw/get2.js",
				"imfv": {
					"commonFields": ["id", "model"]
				}
			}
		},
		"post":{
			"/": {
				"_apiInfo": {
					"l": "Add Entry",
					"group": "Entries"
				},
				"mw": __dirname + "/lib/mw/push2.js",
				"imfv": {
					"commonFields": ["model"],
					"custom": __dirname + "/lib/schemas/index.js"
				}
			}
		},
		"put":{
			"/:id": {
				"_apiInfo": {
					"l": "Edit Entry",
					"group": "Entries"
				},
				"mw": __dirname + "/lib/mw/push2.js",
				"imfv": {
					"commonFields": ["id", "model"],
					"custom": __dirname + "/lib/schemas/index.js"
				}
			}
		},
		"delete":{
			"/:id": {
				"_apiInfo": {
					"l": "Delete Entry",
					"group": "Entries"
				},
				"mw": __dirname + "/lib/mw/delete2.js",
				"imfv": {
					"commonFields": ["id", "model"]
				}
			}
		}
	}
};