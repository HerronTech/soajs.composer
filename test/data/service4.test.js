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
			name: "esClient2",
			es: true
		}
	],
	"models": {
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
	"session": true,
	"oauth": false,
	"errors": {
		400: "Error Connecting to Database"
	},
	"schema": {
		"commonFields": __dirname + "/lib/schemas/imfv.js",
		
		"/get": {
			"method": "GET",
			"_apiInfo": {
				"l": "List Entries",
				"group": "Entries",
				"groupMain": true
			},
			"mw": __dirname + "/lib/mw/myMw.js",
			"imfv": {
				"commonFields": ["start", "limit", "model"]
			}
		},
		"/gettwo": {
			"method": "GET",
			"_apiInfo": {
				"l": "List Entries",
				"group": "Entries",
				"groupMain": true
			},
			"mw": __dirname + "/lib/mw/myMw2.js",
			"imfv": {
				"commonFields": ["start", "limit", "model"]
			}
		},
		"/getthree": {
			"method": "GET",
			"_apiInfo": {
				"l": "List Entries",
				"group": "Entries",
				"groupMain": true
			},
			"mw": __dirname + "/lib/mw/myMw3.js",
			"imfv": {
				"commonFields": ["start", "limit", "model"]
			}
		},
		"/getfour": {
			"method": "GET",
			"_apiInfo": {
				"l": "List Entries",
				"group": "Entries",
				"groupMain": true
			},
			"mw": __dirname + "/lib/mw/myMw4.js",
			"imfv": {
				"commonFields": ["start", "limit", "model"]
			}
		},
		"/getfive": {
			"method": "GET",
			"_apiInfo": {
				"l": "List Entries",
				"group": "Entries",
				"groupMain": true
			},
			"mw": __dirname + "/lib/mw/myMw5.js",
			"imfv": {
				"commonFields": ["start", "limit", "model"]
			}
		}
	}
};
