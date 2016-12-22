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
	"errors": {},
	"schema": {
		"buildMasterIndex": {
			"mw": {
				
			},
			"_apiInfo": {
				"l": "Build Master Index"
			}
		}
		
	}
};