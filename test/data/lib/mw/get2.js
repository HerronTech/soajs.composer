"use strict";

module.exports = {

	"mw": function(req, res){
		
		req.soajs.mongo.myDatabase.findOne("data", {}, function(error, response){
			return res.soajs.returnAPIResponse(req, res, {code: 400, error: error, data: response });
		});
	}
};