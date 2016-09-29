"use strict";

module.exports = {

	"mw": function(req, res){
		return res.soajs.returnAPIResponse(req, res, {code: 400, error: new Error("this is an error message") });
	}
};