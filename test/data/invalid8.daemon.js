"use strict";
var prefix = '';

module.exports = {
	"type": "daemon",
	"dbs": [
		{
			prefix: prefix,
			name: "esClient",
			es: true
		},
		{
			prefix: prefix,
			name: "myDatabase",
			multitenant: false,
			mongo: true
		}
	],
	"injection": true,
	"models":{
		"path": __dirname + "/lib/model/",
		"name": "jean"
	},
	"esIndexes": {
		"master": ["test_intersection"],
		"profile": ["clean"]
	},
	prerequisites: {
		cpu: '',
		memory: ''
	},
	serviceName: "aggregator",
	serviceGroup: "411AGG",
	servicePort: 4060,
	"errors": {},
	"schema": {
		"buildMasterIndex": {
			"mw": __dirname + "/lib/mw/master.js",
			"_apiInfo": {
				"l": "Build Master Index"
			}
		}
	}
};