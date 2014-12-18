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
	var purchasekey = body.user_ID + "_Purchased_Product";
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
			console.log("length="+datajson["product"]["product_list"].length);
			if (datajson["product"]["product_list"].length > 0) {
				for(var i=0; i<datajson["product"]["product_list"].length; i++) {
					if (datajson["product"]["product_list"][i]["device_ID"] == body.device_ID) {
						var PurchaseObj;
						PurchaseObj = {
							user_ID : body.user_ID,
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

exports.query_purchased_all_product = function query_purchased_all_product(body, response) {
	//query database
	var purchasekey = body.user_ID + "_Purchased_Product";

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
			var datajson = JSON.parse(data);
			console.log("length="+datajson["product"]["product_list"].length);

			var resultArray = [];
			if (datajson["product"]["product_list"].length > 0) {
				for(var i=0; i<datajson["product"]["product_list"].length; i++) {					
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
				resultObj = {
					user_ID : body.user_ID,
					product: {
						product_list:[
							resultArray
						]
					}
				};
				var purchaseresult = JSON.parse(JSON.stringify(resultObj));
				var outputdata = merge(purchase_success,purchaseresult);
				response.end(JSON.stringify(outputdata));
				return;
			}
			else {
		            response.statusCode = 500;
		            response.end(JSON.stringify(nodata));
			}
		}
	});
}

exports.query_purchased_history = function query_purchased_history(body, response) {
	//query database
	var purchasekey = body.user_ID + "_Purchased_History";
    console.log("query_purchased_history purchasekey=" + purchasekey);
	var dataexist = 0;
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
						user_ID : body.user_ID,
						product : {
							product_history : [
								{
									device_ID : body.device_ID,
									product : [
										resultArray
									]
								}
							]
						}
					};
					var purchasehisresult = JSON.parse(JSON.stringify(resultObj));
					var outputdata = merge(purchase_history_sucecess,purchasehisresult);
					response.end(JSON.stringify(outputdata));

				}
				else {
					response.statusCode = 500;
					response.end(JSON.stringify(nodata));
				}


			}//end if product_history check
			else {
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
	couchbase.getData(purchasekey, function(err, data) {
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

exports.enable_trial = function enable_trial(body, response) {
	//get start date and end date
	var date = new Date();
	var resultenabledatestr = date.getFullYear().toString()  +(date.getMonth()+1).toString() + date.getDate().toString();
	date.setTime(date.getTime() +  (30 * 24 * 60 * 60 * 1000));
	var resultdatestr = date.getFullYear().toString()  +(date.getMonth()+1).toString() + date.getDate().toString();
	console.log("enable_trial resultenabledatestr=" + resultenabledatestr);
	console.log("enable_trial resultdatestr=" + resultdatestr);

	//insert to trial db
	var trialkey = body.device_ID + "_Trial";
	var TrialObj;
	TrialObj = {
		Trial: [
			{
				device_ID : body.device_ID,
				user_ID : body.user_ID,
				is_enabled_trial : "1"
			}
		]
	};
	var TrialJson = JSON.parse(JSON.stringify(TrialObj));
	couchbase.insertData(trialkey, TrialJson, function(err) {
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
	//query purchased product database
	var trialpurchasekey = body.user_ID + "_Purchased_Product";
        console.log("enable_trial trialpurchasekey=" + trialpurchasekey);
	couchbase.getData(trialpurchasekey, function(err, data) {
		if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
			console.log("Failed to get data\n");
			console.log(data);
			var PurchaseObj;
			PurchaseObj = {
				user_ID : body.user_ID,
				product: {
					product_list: [
						{
							device_ID : body.device_ID,
							product_ID : "trial",
							start_Date : resultenabledatestr,
							end_Date : resultdatestr,
							store : "",
							receipt_data : "",
							package_name : ""
						}
					]
				}
			};

			var PurchaseJson = JSON.parse(JSON.stringify(PurchaseObj));
			couchbase.insertData(trialpurchasekey, PurchaseJson, function(err) {
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

		}
		else {
			console.log("Successed to get data\n");
			console.log(data);
			//Search device_ID
			var purchasepro = JSON.parse(data);
			var isReplacedata = 0;
			console.log("query product length="+purchasepro["product"]["product_list"].length);
			if (purchasepro["product"]["product_list"].length > 0) {
				var newPurchaseObj;
				newPurchaseObj = {
					device_ID : body.device_ID,
					product_ID : "trial",
					start_Date : resultenabledatestr,
					end_Date : resultdatestr,
					store : "",
					receipt_data : "",
					package_name : ""
				};

				for(var i=0; i<purchasepro["product"]["product_list"].length; i++) {
					if(purchasepro["product"]["product_list"][i]["product_ID"] == "trial") {
						//Replace trial data
						console.log("enable_trial insert to Purchased_Product db replace\n");
						purchasepro["product"]["product_list"][i]["start_Date"] = resultenabledatestr;
						purchasepro["product"]["product_list"][i]["end_Date"] = resultdatestr;
						purchasepro["product"]["product_list"][i]["store"] = "";
						isReplacedata = 1;
					}
				}

				if (isReplacedata == 0) {
					console.log("enable_trial insert to Purchased_Product db append\n");
					purchasepro["product"]["product_list"].push(newPurchaseObj);
				}

				var newPurchaseObjJson = JSON.parse(JSON.stringify(purchasepro));

				var newpurchasedkey = body.user_ID + "_Purchased_Product";
				console.log("append data  newpurchasedkey="+newpurchasedkey);
				couchbase.insertData(newpurchasedkey, newPurchaseObjJson, function(err) {
					if(err == 0) {
						console.log("insert data to Purchased_Product db success");
					}
					else {
						console.log("insert data to Purchased_History db fail");
						response.statusCode = 500;
						response.end(JSON.stringify(enabletrialfail));
						return;
					}
				});

			}//end if product_list check
			else {
				console.log("product_list check error\n");
				response.statusCode = 500;
				response.end(JSON.stringify(enabletrialfail));
				return;
			}
		}
	});

	//insert to Purchased_History db
	//query purchased history database
	var purchasehiskey = body.user_ID + "_Purchased_History";
        console.log("enable_trial purchasehiskey=" + purchasehiskey);

	couchbase.getData(purchasehiskey, function(err, data) {
		if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
			console.log("Failed to get data\n");
			console.log("Add new data to Purchased_History db\n");

			//Add new data to Purchased_History db
			var purchasehiskey = body.user_ID + "_Purchased_History";

			var PurchasehisObj;
			PurchasehisObj = {
				user_ID : body.user_ID,
				product: {
					product_history: [
						{
							device_ID : body.device_ID,
							product:[
								{
									product_ID : "trial",
									start_Date : resultenabledatestr,
									end_Date : resultdatestr,
									store : "",
									package_name : ""
								}
							]
						}
					]
				}
			};

			var PurchasehisJson = JSON.parse(JSON.stringify(PurchasehisObj));

			couchbase.insertData(purchasehiskey, PurchasehisJson, function(err) {
				if(err == 0) {
					console.log("insert to Purchased_History db success");
				}
				else {
					console.log("insert to Purchased_History db fail");
					response.statusCode = 500;
					response.end(JSON.stringify(enabletrialfail));
					return;
				}
			});
		}
		else {
			console.log("Successed to get data\n");
			console.log(data);
			var history = JSON.parse(data);
			var deviceIDexist = 0;
			//Search device_ID
			console.log("query product length="+history["product"]["product_history"].length);
			if (history["product"]["product_history"].length > 0) {
				//Check device_ID
				for(var i=0; i<history["product"]["product_history"].length; i++) {
					if (history["product"]["product_history"][i]["device_ID"] == body.device_ID) {
						//device_ID match, append data to product
						deviceIDexist = 1;
						var NewPurchasehisObj;
						NewPurchasehisObj = {
							product_ID : "trial",
							start_Date : resultenabledatestr,
							end_Date : resultdatestr,
							store : "",
							package_name : ""
						};
						history["product"]["product_history"][i].product.push(NewPurchasehisObj);

						var NewhistoryJson = JSON.parse(JSON.stringify(history));
						var newpurchasehiskey = body.user_ID + "_Purchased_History";
						couchbase.insertData(newpurchasehiskey, NewhistoryJson, function(err) {
							if(err == 0) {
								console.log("append data to product Purchased_History db success");								
							}
							else {
								console.log("append data to productPurchased_History db fail");
								response.statusCode = 500;
								response.end(JSON.stringify(enabletrialfail));
								return;
							}
						});									
					}//end if
				}//end for

				if (deviceIDexist == 0) {
					console.log("device_ID not match\n");
					var NewPurchasedevhisObj;
					NewPurchasedevhisObj = {
						device_ID : body.device_ID,
						product:[
							{
								product_ID : "trial",
								start_Date : resultenabledatestr,
								end_Date : resultdatestr,
								store : "",
								package_name : ""
							}
						]
					};
					history["product"]["product_history"].push(NewPurchasedevhisObj);
					var NewdevhistoryJson = JSON.parse(JSON.stringify(history));
					console.log("device_ID match  newpurchasehiskey="+newpurchasehiskey);
					var newpurchasedevhiskey = body.user_ID + "_Purchased_History";
					couchbase.insertData(newpurchasedevhiskey, NewdevhistoryJson, function(err) {
						if(err == 0) {
							console.log("append data to product history Purchased_History db success");
						}
						else {
							console.log("append data to product history Purchased_History db fail");
							response.statusCode = 500;
							response.end(JSON.stringify(enabletrialfail));
							return;
						}
					});

				}
			}
			else {
				console.log("device_ID format error\n");
				response.statusCode = 500;
				response.end(JSON.stringify(enabletrialfail));
				return;
			}
		}
	});
	response.statusCode = 200;
	response.end(JSON.stringify(enable_success));
}



