"use strict";

module.exports = {
	
	"mw": function(req, res){
		var errors = [
			new Error("error1!"),
			new Error("error2!"),
			new Error("error3!")
		];
		return res.soajs.returnAPIResponse(req, res, {error: errors});
	}
};