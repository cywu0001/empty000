var fs = require("fs");
var dotEnv = require("dotenv");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);
var couchbase = require("./Couchbase");
var merge = require('merge');

var google = require('googleapis');
var androidpublisher = google.androidpublisher('v2');
var OAuth2 = google.auth.OAuth2;
var packageName  = env.PACKAGE_NAME;
var clientID     = env.CLIENT_ID;
var clientSecret = env.CLIENT_SECRET;
var redirectURL  = env.REDIRECT_URL;
var code         = env.CODE;
var refreshToken = env.REFRESH_TOKEN;
var oauth2Client = new OAuth2(clientID, clientSecret, redirectURL);
var request = require('request');

var apple_password = '4a2669c2b8e148a3907d4b8047bedba0';

var statusCode =
{
        'pass':{
                code: 1219,
                message: 'Renew purchased product success'
        },
        'missing':{
                code: 1400,
                message: 'Missing parameter'
        },
        /*'not found':{
                code: 1401,
                message: 'Parameter not found'
        },*/
        /*'format error':{
                code: 1402,
                message: 'Parameter format error'
        },*/
        /*'auth error':{
                code: 1403,
                message: 'Authentication failure'
        },*/
        'nodata':{
                code: 1411,
                message: 'No data found'
        },
        'fail':{
                code: 1414,
                message: 'Fail to renew purchasing'
        },
	'apple_pass': {
                code: 1212,
                message: 'Verify Apple receipt success'
        }
	
};

var renew_purchased_product = function(body, res)
{
	var userId = body.user_ID;
	var deviceId = body.device_ID;
	var token =body.token;
	var productId;
	var ret;

	if( userId == '' || deviceId == '' || token == '')
        {
                ret = {
                        status: statusCode['missing'],
                }
                res.statusCode = 400;
                res.send(ret);
                return;
        }

	var receiptData;
	var receiptDataobj;
	var startTime;
	var endTime;
	
	var store;

	var extendValidStartDay;
	var extendValidEndDay;	

	var autoRenewing;
	var DB_info;
	//+ get endTime & receiptData(including "packageName" "productId" "purchaseToken")
	couchbase.getData('Owen3', 
		function(err,data)
		{
			if (err)
                        {
                                console.log("get some error:\n",err);
				return;
                        }
			
			if(data)
                        {
				DB_info = data
                                var dataobj = JSON.parse(data);
                                for (var i in dataobj["product"]["product_list"])
                                {
                                        if( deviceId == dataobj["product"]["product_list"][i]["device_ID"])
                                        {
						store = dataobj["product"]["product_list"][i]["store"];
						if(store == 'Google')
						{
                                                	receiptData = dataobj["product"]["product_list"][i]["receipt_data"];
                                                	receiptDataobj = JSON.parse(receiptData);
						
							startTime = dataobj["product"]["product_list"][i]["start_Date"];
							endTime = dataobj["product"]["product_list"][i]["end_Date"];
							console.log('google store');
						}
						else //apple
						{
							receiptData = dataobj["product"]["product_list"][i]["receipt_data"];
							startTime = dataobj["product"]["product_list"][i]["start_Date"];
                                                        endTime = dataobj["product"]["product_list"][i]["end_Date"];
							productId = dataobj["product"]["product_list"][i]["product_ID"];
							console.log('Apple store');
						}
                                        }
                                }
	//~ get endTime & receiptData(including "packageName" "productId" "purchaseToken")
			
				if(store == 'Google')
				{
					console.log("Owen_test google process!");
	//+ google Auth process	and renew access token
					oauth2Client.setCredentials({
                				refresh_token: refreshToken
        				});
	//~ google Auth process and renew access token
	
	//+ get product valid time info
					androidpublisher.purchases.subscriptions.get({
                				packageName: receiptDataobj["packageName"],
                				subscriptionId: receiptDataobj["productId"],
                				token:receiptDataobj["purchaseToken"],
                				auth: oauth2Client},
        					function(err,data){
							console.log(data);
                                        		autoRenewing = data["autoRenewing"];

							if(autoRenewing)
							{
								extendValidStartDay = new Date(startTime);
								extendValidStartDay.setTime(extendValidStartDay.getTime() + (30 * 24 * 60 * 60 * 1000));
//								console.log(extendValidStartDay.toJSON());
								
								extendValidEndDay = new Date(endTime);
								extendValidEndDay.setTime(extendValidEndDay.getTime() + (30 * 24 * 60 * 60 * 1000));
//								console.log(extendValidEndDay.toJSON());

								//console.log(DB_info);
								var dataobj = JSON.parse(DB_info);
								console.log(dataobj);
								
								for (var i in dataobj["product"]["product_list"])
                                				{
                                        				if( deviceId == dataobj["product"]["product_list"][i]["device_ID"])
                                        				{
                                                				dataobj["product"]["product_list"][i]["start_Date"] = extendValidStartDay;
										dataobj["product"]["product_list"][i]["end_Date"] = extendValidEndDay;
										couchbase.insertData('Owen3', dataobj,
                                						function(err,data){console.log("Owen_test insert!");});
                                        				}
                                				}

							}
        					});
	//~ get product valid time info
				}
				else//apple
				{
					console.log("Owen_test apple process!");
					//console.log(receiptData);
					//console.log(apple_password);
					var data = {
						'receipt-data' : receiptData,
                				'password'     : apple_password
					}
					var postData = JSON.stringify(data);
					request({
        					uri: 'https://sandbox.itunes.apple.com/verifyReceipt',
        					method: 'POST',
        					body: postData,
        					headers: {
            						'content-type': 'application/x-www-form-urlencoded'
            						//'content-length': postData.length
       						}}, function (err, res, body) {
                					var ret = {
                        					status: '',
                        					data  : ''
                					};
        						if (!err) {
            							try {
									//Owen_test
									//console.log(body);
                							body = JSON.parse(body);
									//console.log(body);
									var validTimeStart;
									var validTimeEnd;
									
									
									
									for(var i in body["latest_receipt_info"])
									{
										if(productId == body["latest_receipt_info"][i]["product_id"])
										{
											validTimeStart = body["latest_receipt_info"][i]["purchase_date_ms"];
											validTimeEnd = body["latest_receipt_info"][i]["expires_date_ms"];
										}
//										console.log(validTime);
									}
									
									extendValidStartDay = new Date(parseInt(validTimeStart));
									//console.log("Owen_test Apple Start: "+extendValidStartDay.toJSON());

									extendValidEndDay = new Date(parseInt(validTimeEnd));
									//console.log("Owen_test Apple end: "+extendValidEndDay.toJSON());

									for (var i in dataobj["product"]["product_list"])
                                    {
                                       	if( deviceId == dataobj["product"]["product_list"][i]["device_ID"])
                                       	{
                                           	dataobj["product"]["product_list"][i]["start_Date"] = extendValidStartDay;
                                           	dataobj["product"]["product_list"][i]["end_Date"] = extendValidEndDay;
																					
											couchbase.insertData('Owen3', dataobj,
											function(err,data){console.log("Owen_test insert!");});
                                        }
                                    }

                							if (res.statusCode == 200)
                                					{
                                        					if(body.status == 0)
                                                					ret.status = statusCode[0];
                                        					else
                                                					ret.status = statusCode[1];
                							}
                                					ret.data = body;
            							} catch (ex) {
                                					console.log(ex);
            							}
        						} else {
                        					//console.log(err);
                        					ret.status = statusCode[1];
                        					ret.data = err;
        						}
    						}
					);
				}
                        }
			else
			{
				ret = {
                        		status: statusCode['nodata'],
                		}
                		res.statusCode = 500;
                		res.send(ret);
                		return;
			}

		});

	//console.log(receiptDataobj["purchaseToken"]);	
	console.log("Owen_test renew_purchased_product1\n userId = "+userId+"\n deviceId = "+deviceId+"\n token = "+token);
}

exports.renew = renew_purchased_product;

var renew_all_purchased_product = function(body, response)
{
/*	var userId = body.user_ID;
	var packageName = body.package_Name;
	var token =body.token;
	var productId;
	var ret;

	if( userId == '' || packageName == '' || token == '')
        {
                ret = {
                        status: statusCode['missing'],
                }
                res.statusCode = 400;
                res.send(ret);
                return;
        }

	var receiptData;
	var receiptDataobj;
	var startTime;
	var endTime;
	
	var store;

	var extendValidStartDay;
	var extendValidEndDay;	

	var autoRenewing;
	var dataobj;
	//	var DB_info;
	//+ get endTime & receiptData(including "packageName" "productId" "purchaseToken")
	couchbase.getData('Owen3', 
		function(err,data)
		{
			if (err){
				console.log("get some error:\n",err);
				return;
            }
			
			if(data)
            {
//				DB_info = data
                dataobj = JSON.parse(data);
                for (var i in dataobj["product"]["product_list"])
                {
					console.log("Owen_debug 1-"+i);
                    if( packageName == dataobj["product"]["product_list"][i]["package_name"])
                    {
						store = dataobj["product"]["product_list"][i]["store"];
						if(store == 'Google')
						{
                           	receiptData = dataobj["product"]["product_list"][i]["receipt_data"];
                           	receiptDataobj = JSON.parse(receiptData);
						
							startTime = dataobj["product"]["product_list"][i]["start_Date"];
							endTime = dataobj["product"]["product_list"][i]["end_Date"];
							console.log('google store');
						}
						else //apple
						{
							receiptData = dataobj["product"]["product_list"][i]["receipt_data"];
							startTime = dataobj["product"]["product_list"][i]["start_Date"];
                            endTime = dataobj["product"]["product_list"][i]["end_Date"];
							productId = dataobj["product"]["product_list"][i]["product_ID"];
							console.log('Apple store');
						}
                    }
                
	//~ get endTime & receiptData(including "packageName" "productId" "purchaseToken")
			
					if(store == 'Google')
					{
						console.log("Owen_test google process!");
	//+ google Auth process	and renew access token
						oauth2Client.setCredentials({
                				refresh_token: refreshToken
        				});
	//~ google Auth process and renew access token
	
	//+ get product valid time info
						androidpublisher.purchases.subscriptions.get({
                				packageName: receiptDataobj["packageName"],
                				subscriptionId: receiptDataobj["productId"],
                				token:receiptDataobj["purchaseToken"],
                				auth: oauth2Client},
        					function(err,data){
							console.log(data);
                                        		autoRenewing = data["autoRenewing"];

							if(autoRenewing)
							{
								extendValidStartDay = new Date(startTime);
								extendValidStartDay.setTime(extendValidStartDay.getTime() + (30 * 24 * 60 * 60 * 1000));
//								console.log(extendValidStartDay.toJSON());
								
								extendValidEndDay = new Date(endTime);
								extendValidEndDay.setTime(extendValidEndDay.getTime() + (30 * 24 * 60 * 60 * 1000));
//								console.log(extendValidEndDay.toJSON());

								//console.log(DB_info);
//								var dataobj = JSON.parse(DB_info);
//								console.log(dataobj);
								
//								for (var i in dataobj["product"]["product_list"])
//                                				{
//                                        				if( deviceId == dataobj["product"]["product_list"][i]["device_ID"])
//                                        				{
                   				dataobj["product"]["product_list"][i]["start_Date"] = extendValidStartDay;
								dataobj["product"]["product_list"][i]["end_Date"] = extendValidEndDay;
//										couchbase.insertData('Owen3', dataobj,
//                                						function(err,data){console.log("Owen_test insert!");});
//                                        				}
//                                				}

							}
        					});
	//~ get product valid time info
					}
					else//apple
					{
						console.log("Owen_test apple process!");
						//console.log(receiptData);
						//console.log(apple_password);
						console.log("Owen_debug 1");
						var data = {
							'receipt-data' : receiptData,
                			'password'     : apple_password
						}
						var postData = JSON.stringify(data);
						request({
							uri: 'https://sandbox.itunes.apple.com/verifyReceipt',
							method: 'POST',
        					body: postData,
        					headers: {
            					'content-type': 'application/x-www-form-urlencoded'
            						//'content-length': postData.length
       						}}, function (err, res, body) {
                					var ret = {
                        					status: '',
                        					data  : ''
                					};
        						if (!err) {
            							try {
									//Owen_test
									//console.log(body);
                					body = JSON.parse(body);
									//console.log(body);
									var validTimeStart;
									var validTimeEnd;
									console.log("Owen_debug 2");
									for(var j in body["latest_receipt_info"])
									{
										if(productId == body["latest_receipt_info"][j]["product_id"])
										{
											validTimeStart = body["latest_receipt_info"][j]["purchase_date_ms"];
											validTimeEnd = body["latest_receipt_info"][j]["expires_date_ms"];
										}
//										console.log(validTime);
									}
									
									extendValidStartDay = new Date(parseInt(validTimeStart));
									//console.log("Owen_test Apple Start: "+extendValidStartDay.toJSON());

									extendValidEndDay = new Date(parseInt(validTimeEnd));
									//console.log("Owen_test Apple end: "+extendValidEndDay.toJSON());

									//for (var i in dataobj["product"]["product_list"])
                                    //{
                                    //   	if( deviceId == dataobj["product"]["product_list"][i]["device_ID"])
                                    //   	{
                                           	dataobj["product"]["product_list"][i]["start_Date"] = extendValidStartDay;
                                           	dataobj["product"]["product_list"][i]["end_Date"] = extendValidEndDay;
											console.log("Owen_debug 3");
//											couchbase.insertData('Owen3', dataobj,
//                                							function(err,data){console.log("Owen_test insert!");});
                                    //	}
                                    //}

                							if (res.statusCode == 200)
                                					{
                                        					if(body.status == 0)
                                                					ret.status = statusCode[0];
                                        					else
                                                					ret.status = statusCode[1];
                							}
                                					ret.data = body;
            							} catch (ex) {
                                					console.log(ex);
            							}
        						} else {
                        					console.log(err);
                        					ret.status = statusCode[1];
                        					ret.data = err;
        						}
    						}
						);
					}
                }
				console.log("Owen_debug 4 i = "+i);
				//couchbase.insertData('Owen3', dataobj,function(err,data){console.log("Owen_test insert!");});
				}
			else
			{
				ret = {
                        		status: statusCode['nodata'],
                		}
                		res.statusCode = 500;
                		res.send(ret);
                		return;
			}
		});

	//console.log(receiptDataobj["purchaseToken"]);	
	console.log("Owen_test renew_purchased_product1\n userId = "+userId+"\n"+"token = "+token+"package_name = "+packageName);*/
}
exports.renewall = renew_all_purchased_product;
