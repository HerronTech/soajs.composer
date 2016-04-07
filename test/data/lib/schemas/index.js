"use strict";


module.exports = {
	"entry": {
		"required": true,
		"source": ["body.entry"],
		"validation":{
			"type": "object",
			"required": true,
			"properties": {
				"id": {
					"required": false,
					"type": "string"
				},
				"name_eng": {
					"required": true,
					"type": "string"
				},
				"name_fra": {
					"required": true,
					"type": "string"
				}
			},
			"additionalProperties": false
		}
	}
};