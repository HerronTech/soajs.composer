"use strict";


module.exports = {
	"id": {
		"required": true,
		"source": ["body.id", "query.id", "params.id"],
		"validation":{
			"type": "string",
			"required": true
		}
	},
	"start": {
		"required": false,
		"source": ["body.start", "query.start"],
		"default": 1,
		"validation":{
			"type": "number",
			"min": 0
		}
	},
	"limit": {
		"required": false,
		"source": ["body.limit", "query.limit"],
		"default": 100,
		"validation":{
			"type": "number",
			"min": 1,
			"max": 200
		}
	}
};