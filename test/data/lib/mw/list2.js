"use strict";

module.exports = {

	"mw": function(req, res){
		req.soajs.model.initConnections(req, res, function(){
			var modelName = req.soajs.inputmaskData.model || req.soajs.config.models.name;
			console.log("inside mw ( " + modelName + " ):", Object.keys(req.soajs[modelName]));
			return res.soajs.returnAPIResponse(req, res, {data: "allah w akbar !"});
		});
	}
};