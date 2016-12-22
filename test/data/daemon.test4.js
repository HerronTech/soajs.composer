"use strict";
var prefix = '';

module.exports = {
	"type": "daemon",
	"dbs": [
		{
			prefix: prefix,
			name: "esClient2",
			es: true
		},
		{
			prefix: prefix,
			name: "myDatabase",
			multitenant: false,
			mongo: true
		},
		{
			prefix: prefix,
			name: "myDatabase2",
			multitenant: true,
			mongo: true
		}
	],
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
	injection: true,
	"models":{
		"path": __dirname + "/lib/model/",
		"name": "mongo"
	},
	"errors": {},
	"schema": {
		"mtMW": {
			"mw": __dirname + "/lib/mw/mtDaemon.js",
			"_apiInfo": {
				"l": "Build Master Index"
			}
		}
	}
};