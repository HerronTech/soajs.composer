"use strict";


module.exports = {
	"id": {
		"required": true,
		"source": ["body.id"],
		"validation":{
			"type": "string",
			"required": true
		}
	}
};