var fs = require("fs");
var dotEnv = require("dotenv");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);
var merge = require('merge');
var couchbase = require("./Couchbase");

var purchase_success = {"status" :{"code": 1214, "message": "Query purchased product success"},};
var purchase_all_success = {"status" :{"code": 1215, "message": "Query purchased all product success"},};
var purchase_history_sucecess = {"status" :{"code": 1216, "message": "Query purchased history success"},};
var query_enable_success = {"status" :{"code": 1221, "message": "Query is_enabled_trial success"}};
var enable_success = {"status" :{"code": 1222, "message": "Enabled trial success"},};

var nodata = {"status":{"code":1411,"message":"No data found"}};
var enabletrialfail = {"status":{"code":1415,"message":"Fail to enable trial"}};


exports.query_purchased_product = function query_purchased_product(response, user_ID, device_ID) {
	//query database
	var purchasekey = user_ID + "_purchased";
    console.log("query_purchased_product purchasekey=" + purchasekey);

	couchbase.getData(purchasekey, function(err, data) {
		if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
			console.log("Failed to get data\n");
			console.log(data);
	        response.statusCode = 500;
	        response.end(JSON.stringify(nodata));
		}
		else {
			console.log("Successed to get data\n");
			console.log(data);
			var datajson = JSON.parse(data);

			if (datajson["product"]["product_list"].length > 0) {
				for(var i=0; i<datajson["product"]["product_list"].length; i++) {
					if (datajson["product"]["product_list"][i]["device_ID"] == device_ID) {
						var PurchaseObj;
						PurchaseObj = {
							user_ID : user_ID,
							product: {
								product_list:[
									{
										device_ID : device_ID,
										product_ID : datajson["product"]["product_list"][i]["product_ID"],
										start_Date : datajson["product"]["product_list"][i]["start_Date"],
										end_Date : datajson["product"]["product_list"][i]["end_Date"],
										store : datajson["product"]["product_list"][i]["store"],
									}
								]
							}
						};
						var purchaseresult = JSON.parse(JSON.stringify(PurchaseObj));
						var outputdata = merge(purchase_success,purchaseresult);
	    				response.statusCode = 200;
						response.end(JSON.stringify(outputdata));
						return;
					}			
				}
		        response.statusCode = 500;
		        response.end(JSON.stringify(nodata));
			}
			else {
		        response.statusCode = 500;
		        response.end(JSON.stringify(nodata));
			}
		}
	});
}

exports.query_purchased_all_product = function query_purchased_all_product(response, user_ID, package_name) {
	//query database
	var purchasekey = user_ID + "_purchased";
    console.log("query_purchased_all_product purchasekey=" + purchasekey);

	couchbase.getData(purchasekey, function(err, data) {
		if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
			console.log("Failed to get data\n");
			console.log(data);
	        response.statusCode = 500;
	        response.end(JSON.stringify(nodata));
		}
		else {
			console.log("Successed to get data\n");
			console.log(data);
			var purchaseallresult = JSON.parse(data)
			var outputdata = merge(purchase_all_success,purchaseallresult);
			response.statusCode = 200;
			response.end(JSON.stringify(outputdata));
		}
	});
}

exports.query_purchased_history = function query_purchased_history(response, user_ID, package_name) {
	//query database
	var purchasekey = user_ID + "_" + package_name;
    console.log("query_purchased_history purchasekey=" + purchasekey);

	couchbase.getData(purchasekey, function(err, data) {
		if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
			console.log("Failed to get data\n");
			console.log(data);
		}
		else {
			console.log("Successed to get data\n");
			console.log(data);
			var datajson = JSON.parse(data);
		}
	});
    response.statusCode = 200;
    response.end("200 OK");
}


exports.is_enable_trial = function is_enable_trial(response, device_ID) {
	var trialresult;
	//get trial data
	couchbase.getData(device_ID, function(err, data) {
		if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
			console.log("Failed to get data\n");
			console.log(data);
			trialresult = {"is_enabled_trial": "0"};
		}
		else {
			console.log("Successed to get data\n");
			console.log(data);
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

exports.enable_trial = function enable_trial(response, user_ID, device_ID) {
	//get start date and end date
	var date = new Date();
	var resultenabledate = date.getFullYear() +'.' +(date.getMonth()+1) +'.' +date.getDate();
	var resultenabledatestr = resultenabledate.toString();
	date.setTime(date.getTime() +  (30 * 24 * 60 * 60 * 1000));

	var resultdate = date.getFullYear() +'.' +(date.getMonth()+1) +'.' +date.getDate();
	var resultdatestr = resultdate.toString();

	//insert to trial db
	var TrialObj;
	TrialObj = {
		Trial: [
			{
				device_ID : device_ID,
				user_ID : user_ID,
				is_enabled_trial : "1"
			}
		]
	};
	var TrialJson = JSON.parse(JSON.stringify(TrialObj));
	couchbase.insertData(device_ID, TrialJson, function(err) {
		if(err == 0) {
    		console.log("insert to trial db success");
		}
		else {
    		console.log("insert to trial db fail");
			response.statusCode = 500;
			response.end(JSON.stringify(enabletrialfail));
			return;
		}
	});


	//insert to Purchased_Product db
	var trialkey = user_ID + "_trial_purchased";
	var PurchaseObj;
	PurchaseObj = {
		user_ID : user_ID,
		product: {
			product_list: [
				{
					device_ID : device_ID,
					product_ID : "trial",
					start_Date : resultenabledatestr,
					end_Date : resultdatestr,
					store : ""
				}
			]
		}
	};

	var PurchaseJson = JSON.parse(JSON.stringify(PurchaseObj));
	couchbase.insertData(trialkey, PurchaseJson, function(err) {
		if(err == 0) {
    		console.log("insert to Purchased_Product db success");
		}
		else {
    		console.log("insert to Purchased_Product db fail");
			response.statusCode = 500;
			response.end(JSON.stringify(enabletrialfail));
			return;
		}
	});

	//insert to Purchased_History db
	//query purchased history database


    response.statusCode = 200;
    response.end("200 OK");
}


