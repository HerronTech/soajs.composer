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
		},
		
		"cleanUpProfileIndex": {
			"mw": __dirname + "/lib/mw/profile.js",
			"_apiInfo": {
				"l": "Clean Profile Cities, Features & Categories from Autocomplete Indexes"
			}
		},
		
		"buildProfileAccessoriesIndex": {
			"mw": __dirname + "/lib/mw/profile.js",
			"_apiInfo": {
				"l": "Build Profile Categories, Cities, Features and Auto Complete Indexes"
			}
		},
		
		"buildProfilecategoryCitiesIndex": {
			"mw": __dirname + "/lib/mw/profile.js",
			"_apiInfo": {
				"l": "Build Profile Category_cities Indexes"
			}
		},
		
		"buildProfileIndex": {
			"mw": __dirname + "/lib/mw/profile.js",
			"_apiInfo": {
				"l": "Build Profile Addresses and Autocomplete Indexes"
			}
		},
		
		"fullTest": {
			"mw": __dirname + "/lib/mw/fullRun.js",
			"_apiInfo": {
				"l": "Build Both Master and Profile Indexes"
			}
		}
		
	}
};