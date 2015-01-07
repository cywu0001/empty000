var fs = require("fs");
var dotEnv = require("dotenv");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);
var merge = require('merge');
var couchbase = require("./Couchbase");
var BlackloudLogger = require("../../utils/BlackloudLogger");

var logger = new BlackloudLogger(env.PROJECT_NAME, 'BillingPurchaseQuery');

var purchase_success = {"status" :{"code": 1214, "message": "Query purchased product success"},};
var purchase_all_success = {"status" :{"code": 1215, "message": "Query purchased all product success"},};
var purchase_history_sucecess = {"status" :{"code": 1216, "message": "Query purchased history success"},};
var query_enable_success = {"status" :{"code": 1221, "message": "Query is_enabled_trial success"}};
var enable_success = {"status" :{"code": 1222, "message": "Enabled trial success"},};

var nodata = {"status":{"code":1411,"message":"No data found"}};
var enabletrialfail = {"status":{"code":1415,"message":"Fail to enable trial"}};

function checkDate(startDate, endDate, dbstartDate, dbendDate) {

	var startDatestr = startDate.substr(0,4) + "-" + startDate.substr(4,2) + "-" + startDate.substr(6,2);
	var endDatestr = endDate.substr(0,4) + "-" + endDate.substr(4,2) + "-" + endDate.substr(6,2);
	var dbstartDatestr = dbstartDate.substr(0,4) + "-" + dbstartDate.substr(4,2) + "-" + dbstartDate.substr(6,2);
	var dbendDatestr = dbendDate.substr(0,4) + "-" + dbendDate.substr(4,2) + "-" + dbendDate.substr(6,2);

	var startDatetime = new Date(startDatestr);
	var endDatetime = new Date(endDatestr);
	var dbstartDatetime = new Date(dbstartDatestr);
	var dbendDatetime = new Date(dbendDatestr);

	var startDateInRange = 0;
	var endDateInRange = 0;

	if (dbstartDatetime.getTime() >=startDatetime.getTime() && dbstartDatetime.getTime()<=endDatetime.getTime()) {
		startDateInRange = 1;
	}

	if (dbendDatetime.getTime() >=startDatetime.getTime() && dbendDatetime.getTime()<=endDatetime.getTime()) {
		endDateInRange = 1;
	}

	if (startDateInRange==1 && endDateInRange==1) {
		return true;
	}
	else {
		return false;
	}
}


exports.query_purchased_product = function query_purchased_product(body, response) {
	//query database
	var purchasekey = body.user_name + "_Purchased_Product";
	logger.log("info", "query_purchased_product purchasekey=" + purchasekey);
	couchbase.getData(purchasekey, function(err, data) {
		if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
		    logger.log("info", "Failed to get data, return no data");
	            response.statusCode = 500;
	            response.end(JSON.stringify(nodata));
		}
		else {
			logger.log("info", "Successed to get data");
			console.log(data);
			var datajson = JSON.parse(data);
			console.log("length="+datajson["product"]["product_list"].length);
			if (datajson["product"]["product_list"].length > 0) {
				for(var i=0; i<datajson["product"]["product_list"].length; i++) {
					if (datajson["product"]["product_list"][i]["device_ID"] == body.device_ID) {
						var PurchaseObj;
						PurchaseObj = {
							user_name : body.user_name,
							product: {
								product_list:[
									{
										device_ID : body.device_ID,
										product_ID : datajson["product"]["product_list"][i]["product_ID"],
										start_Date : datajson["product"]["product_list"][i]["start_Date"],
										end_Date : datajson["product"]["product_list"][i]["end_Date"],
										store : datajson["product"]["product_list"][i]["store"]
									}
								]
							}
						};
						logger.log("info", "Successed to get outputdata");
						var purchaseresult = JSON.parse(JSON.stringify(PurchaseObj));
						var outputdata = merge(purchase_success,purchaseresult);
	    				        response.statusCode = 200;
						response.end(JSON.stringify(outputdata));
						return;
					}
				}
			     logger.log("info", "device_ID not found, return no data");
		             response.statusCode = 500;
		             response.end(JSON.stringify(nodata));
			}
			else {
			    logger.log("info", "product list <0 return no data");
		            response.statusCode = 500;
		            response.end(JSON.stringify(nodata));
			}
		}
	});
}

exports.query_purchased_all_product = function query_purchased_all_product(body, response) {
	//query database
	var dataexist = 0;
	var purchasekey = body.user_name + "_Purchased_Product";
	logger.log("info", "query_purchased_all_product purchasekey=" + purchasekey);
 	logger.log("info", "query_purchased_all_product body.package_name=" + body.package_name);

	couchbase.getData(purchasekey, function(err, data) {
		if (err && err != 12) { // 12 : LCB_KEY_EEXISTS
		    logger.log("info", "Failed to get data, return no data");
	            response.statusCode = 500;
	            response.end(JSON.stringify(nodata));
		}
		else {
			logger.log("info", "Successed to get data");
			console.log(data);
			var datajson = JSON.parse(data);
			console.log("length="+datajson["product"]["product_list"].length);

			var resultArray = [];
			if (datajson["product"]["product_list"].length > 0) {
				for(var i=0; i<datajson["product"]["product_list"].length; i++) {					
					if (datajson["product"]["product_list"][i]["package_name"] == body.package_name) {
						dataexist = 1;
						var PurchaseObj;
						PurchaseObj = {
							device_ID : datajson["product"]["product_list"][i]["device_ID"],
							product_ID : datajson["product"]["product_list"][i]["product_ID"],
							start_Date : datajson["product"]["product_list"][i]["start_Date"],
							end_Date : datajson["product"]["product_list"][i]["end_Date"],
							store : datajson["product"]["product_list"][i]["store"]
						};
						resultArray.push(PurchaseObj);
					}
				}
				if (dataexist == 1) {
					resultObj = {
						user_name : body.user_name,
						product: {
							product_list:
								resultArray						
						}
					};
					logger.log("info", "Successed to get outputdata");
					var purchaseresult = JSON.parse(JSON.stringify(resultObj));
					var outputdata = merge(purchase_all_success,purchaseresult);
					response.end(JSON.stringify(outputdata));
					return;
				}
				else {
					logger.log("info", "package_name not match, return no data");
					response.statusCode = 500;
					response.end(JSON.stringify(nodata));
					return;
				}
			}
			else {
				logger.log("info", "product list <0 return no data");
				response.statusCode = 500;
				response.end(JSON.stringify(nodata));
			}
		}
	});
}
exports.query_purchased_receipt_product = function query_purchased_receipt_product(user_name, package_name, result) {
	//query database
	var dataexist = 0;
	var purchasekey = user_name + "_Purchased_Product";
	logger.log("info", "query_purchased_receipt_product purchasekey=" + purchasekey);
 
	couchbase.getData(purchasekey, function(err, data) {
		if (err && err != 12) { // 12 : LCB_KEY_EEXISTS
		    logger.log("info", "Failed to get data, return no data");
			result(JSON.stringify(nodata), null);
		}
		else {
			logger.log("info", "Successed to get data");
			console.log(data);
			var datajson = JSON.parse(data);
			console.log("length="+datajson["product"]["product_list"].length);

			var resultArray = [];
			if (datajson["product"]["product_list"].length > 0) {
				for(var i=0; i<datajson["product"]["product_list"].length; i++) {
					if (datajson["product"]["product_list"][i]["package_name"] == package_name) {
						dataexist = 1;
						var PurchaseObj;
						PurchaseObj = {
							device_ID : datajson["product"]["product_list"][i]["device_ID"],
							product_ID : datajson["product"]["product_list"][i]["product_ID"],
							start_Date : datajson["product"]["product_list"][i]["start_Date"],
							end_Date : datajson["product"]["product_list"][i]["end_Date"],
							store : datajson["product"]["product_list"][i]["store"]
						};
						resultArray.push(PurchaseObj);
					}
				}

				if (dataexist == 1) {
					resultObj = {
						user_name : user_name,
						product: {
							product_list:
								resultArray						
						}
					};
					logger.log("info", "Successed to get outputdata");
					var purchaseresult = JSON.parse(JSON.stringify(resultObj));
					var outputdata = merge(purchase_all_success, purchaseresult);
					result(JSON.stringify(outputdata), null);
				}
				else {
					logger.log("info", "package_name not match, return no data");
					result(JSON.stringify(nodata), null);
				}
			}
			else {
				logger.log("info", "product list <0 return no data");
				result(JSON.stringify(nodata), null);
			}
		}
	});
}

exports.query_purchased_history = function query_purchased_history(body, response) {
	//query database
	var purchasekey = body.user_name + "_Purchased_History";
	logger.log("info", "query_purchased_history purchasekey=" + purchasekey);
	var dataexist = 0;
	couchbase.getData(purchasekey, function(err, data) {
		if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
			logger.log("info", "Failed to get data, return no data");
			response.statusCode = 500;
			response.end(JSON.stringify(nodata));
		}
		else {
			logger.log("info", "Successed to get data");
			console.log(data);
			var datajson = JSON.parse(data);
			var i, j;
			var resultArray = [];
			if (datajson["product"]["product_history"].length > 0) {
				for(i=0; i<datajson["product"]["product_history"].length; i++) {
					if (datajson["product"]["product_history"][i]["device_ID"] == body.device_ID) {
						if (datajson["product"]["product_history"][i]["product"].length>0) {
							for(j=0; j<datajson["product"]["product_history"][i]["product"].length; j++) {
								if(datajson["product"]["product_history"][i]["product"][j]["package_name"] == body.package_name) {
									var checkresult = checkDate(body.start_Date,body.end_Date,
										datajson["product"]["product_history"][i]["product"][j]["start_Date"],
										datajson["product"]["product_history"][i]["product"][j]["end_Date"]);
									if (checkresult == true) {
										dataexist = 1;
										var PurchasehisObj;
										PurchasehisObj = {
											product_ID : datajson["product"]["product_history"][i]["product"][j]["product_ID"],
											start_Date : datajson["product"]["product_history"][i]["product"][j]["start_Date"],
											end_Date : datajson["product"]["product_history"][i]["product"][j]["end_Date"],
											store : datajson["product"]["product_history"][i]["product"][j]["store"]
										};
										resultArray.push(PurchasehisObj);		
									}
								}//end if package_name
							}//end for
						}//end if product length check
					}//end if device_ID check
				}//end for

				if (dataexist == 1) {
					resultObj = {
						user_name : body.user_name,
						product : {
							product_history :
								{
									device_ID : body.device_ID,
									product :
										resultArray									
								}
						}
					};
					logger.log("info", "Successed to get outputdata");
					var purchasehisresult = JSON.parse(JSON.stringify(resultObj));
					var outputdata = merge(purchase_history_sucecess,purchasehisresult);
					response.end(JSON.stringify(outputdata));

				}
				else {
					logger.log("info", "Do not find data, return no data");
					response.statusCode = 500;
					response.end(JSON.stringify(nodata));
				}


			}//end if product_history check
			else {
				logger.log("info", "product history not exist, return no data");
				response.statusCode = 500;
				response.end(JSON.stringify(nodata));
			}
		}
	});
}


exports.is_enable_trial = function is_enable_trial(body, response) {
	var trialresult;
	//get trial data
	var purchasekey = body.device_ID + "_Trial";
	logger.log("info", "is_enable_trial purchasekey=" + purchasekey);
	couchbase.getData(purchasekey, function(err, data) {
		if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
			logger.log("info", "Failed to get data");
			trialresult = {"is_enabled_trial": "0"};
		}
		else {
			logger.log("info", "Successed to get data");
			var datajson = JSON.parse(data);
    		console.log("data=", datajson["Trial"][0].is_enabled_trial);
			var isenable = datajson["Trial"][0].is_enabled_trial;
			if (isenable == 1) {
				trialresult = {"is_enabled_trial": "1"};
			}
			else {
				trialresult = {"is_enabled_trial": "0"};
			}
		}
		var outputdata = merge(query_enable_success,trialresult);
	    response.statusCode = 200;
		response.end(JSON.stringify(outputdata));
	});
}

exports.enable_trial = function enable_trial(body, response) {
	//get start date and end date
	var date = new Date();
	var startMonth, endMonth, startDate, endDate;

	if (date.getMonth() >= 0 && date.getMonth() < 9) {
		startMonth = "0" + (date.getMonth()+1).toString();
	}
	else {
		startMonth = (date.getMonth()+1).toString();
	}

	if (date.getDate() >= 1 && date.getDate() < 10) {
		startDate = "0" + date.getDate().toString();
	}
	else {
		startDate = date.getMonth().toString();
	}
	var resultenabledatestr = date.getFullYear().toString()  + startMonth + startDate;

	date.setTime(date.getTime() +  (30 * 24 * 60 * 60 * 1000));

	if (date.getMonth() >= 0 && date.getMonth() < 9) {
		endMonth = "0" + (date.getMonth()+1).toString();
	}
	else {
		endMonth = (date.getMonth()+1).toString();
	}

	if (date.getDate() >= 1 && date.getDate() < 10) {
		endDate = "0" + date.getDate().toString();
	}
	else {
		endDate = date.getMonth().toString();
	}
	var resultdatestr = date.getFullYear().toString()  + endMonth + endDate;
	
	logger.log("info", "enable_trial resultenabledatestr=" + resultenabledatestr);
	logger.log("info", "enable_trial resultdatestr=" + resultdatestr);

	//insert to trial db
	var trialkey = body.device_ID + "_Trial";
	var TrialObj;
	TrialObj = {
		Trial: [
			{
				device_ID : body.device_ID,
				user_name : body.user_name,
				is_enabled_trial : "1"
			}
		]
	};
	var TrialJson = JSON.parse(JSON.stringify(TrialObj));
	couchbase.insertData(trialkey, TrialJson, function(err) {
		if(err == 0) {
			logger.log("info", "insert to trial db success");
		}
		else {
			logger.log("info", "insert to trial db fail");
			response.statusCode = 500;
			response.end(JSON.stringify(enabletrialfail));
			return;
		}
	});

	//insert to Purchased_Product db
	//query purchased product database
	var purchaseObj;
	purchaseObj = {
		user_name : body.user_name,
		device_ID : body.device_ID,
		product_ID : "trial",
		start_Date : resultenabledatestr,
		end_Date : resultdatestr,
		store : "",
		receipt_data : "",
		package_name : body.package_name
	};

	couchbase.insertPurchasedData(purchaseObj, function (err, data) {
		if(err == 0) {
			logger.log("info", "insert to Purchased_Product db success");
		}
		else {
			logger.log("info", "insert to Purchased_Product db fail");
			response.statusCode = 500;
			response.end(JSON.stringify(enabletrialfail));
			return;
		}

	});


	//insert to Purchased_History db
	//query purchased history database
	var purchasehisObj;
	purchasehisObj = {
		user_name : body.user_name,
		device_ID : body.device_ID,
		product_ID : "trial",
		start_Date : resultenabledatestr,
		end_Date : resultdatestr,
		store : "",
		package_name : body.package_name
	};

	couchbase.insertHistoryData(purchasehisObj, function (err, data) {
		if(err == 0) {
			logger.log("info", "insert to Purchased_History db success");
		}
		else {
			logger.log("info", "insert to Purchased_History db fail");
			response.statusCode = 500;
			response.end(JSON.stringify(enabletrialfail));
			return;
		}

	});

	logger.log("info", "enable trial success");
	response.statusCode = 200;
	response.end(JSON.stringify(enable_success));
}



