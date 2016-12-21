"use strict";

module.exports = {
	
	"mw": function(req, res){
		var errors = [
			{code: 402, message : "error1!"},
			{code: 402, msg : "error2!"},
			{code: 402, msg : "error3!"}
		];
		return res.soajs.returnAPIResponse(req, res, {error: errors});
	}
};