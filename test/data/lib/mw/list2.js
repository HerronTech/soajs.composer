"use strict";

module.exports = {

	"mw": function(req, res){
		var modelName = req.soajs.inputmaskData.model || req.soajs.config.models.name;
		console.log("inside mw ( " + modelName + " ):", Object.keys(req.soajs[modelName]));
		return res.soajs.returnAPIResponse(req, res, {data: "Working..."});
	}
};