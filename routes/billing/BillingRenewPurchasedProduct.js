var fs = require("fs");
var dotEnv = require("dotenv");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);
var couchbase = require("./Couchbase");
var request = require('request');

var limiter = require("simple-rate-limiter");

var google = require('googleapis');
var androidpublisher = google.androidpublisher('v2');

var packageName = env.PACKAGE_NAME;
var clientID = env.CLIENT_ID;
var clientSecret = env.CLIENT_SECRET;
var redirectURL = env.REDIRECT_URL;
var apple_varify_server = env.APPLE_VERIFY_SERVER;
var code = env.CODE;
var refreshToken = env.REFRESH_TOKEN;

var apple_password = env.APPLE_PASSWORD;

var OAuth2 = google.auth.OAuth2;
var oauth2Client = new OAuth2(clientID, clientSecret, redirectURL);

var G_pkgName;
var G_data;
var G_count; 
var G_res;

var statusCode = 
{
	'pass':
	{
		code:1219,
		message:'Renew purchased product success'
	},
	'all_pass':
	{
		code:1220,
		message: 'Renew purchased all product success'
	},
	'missing':
	{
		code:1400,
		message:'Missing parameter'
	},
	'nodata':
	{
		code:1411,
		message: 'No data found'
	},
	'fail':
	{
		code:1414,
		message: 'Fail to renew purchasing'
	}
}

var renew_purchased_product = function(body, res)
{
	console.log('renew_purchased_product start!');

	var token = body.token;
	var user_name = body.user_name;
	var device_ID = body.device_ID;
	var productId;
	
	var couchBaseDataObj;
	var receiptdata;
	var store_flag;
	var startTime;
	var endTime;

	var ret;

//	console.log("Owen_debug token = "+ token+ " user_name = "+user_name+" device_ID = "+device_ID);

	couchbase.getData(user_name+"_Purchased_Product",
		function(err,data)
		{
			if(err)
			{
				console.log("couchbase.getData() have some error!");
				return;
			}

			if(data)
			{
				couchBaseDataObj = JSON.parse(data);
				//console.log(couchBaseDataObj);
				
				for( var i in couchBaseDataObj['product']['product_list'])
				{
					if( device_ID == couchBaseDataObj['product']['product_list'][i]['device_ID'])
					{
						if(couchBaseDataObj['product']['product_list'][i]['store'] == 'Google')
						{
							receiptdata = couchBaseDataObj['product']['product_list'][i]['receipt_data'];
							receiptdata = JSON.parse(receiptdata);
							store_flag = couchBaseDataObj['product']['product_list'][i]['store'];
							productId = couchBaseDataObj['product']['product_list'][i]['product_ID'];
							startTime = couchBaseDataObj['product']['product_list'][i]['start_Date'];
							endTime = couchBaseDataObj['product']['product_list'][i]['end_Date'];
							//console.log('startTime = '+startTime+' endTime = '+endTime );
							packageName = couchBaseDataObj['product']['product_list'][i]['package_name'];
						}
						else//(couchBaseDataObj['product']['product_list'][i]['store'] == 'Apple')
						{
							receiptdata = couchBaseDataObj["product"]["product_list"][i]["receipt_data"];
							store_flag = couchBaseDataObj['product']['product_list'][i]['store'];
							startTime = couchBaseDataObj["product"]["product_list"][i]["start_Date"];
							endTime = couchBaseDataObj["product"]["product_list"][i]["end_Date"];
							productId = couchBaseDataObj["product"]["product_list"][i]["product_ID"];
							packageName = couchBaseDataObj['product']['product_list'][i]['package_name'];
						}
					}
				}
				console.log("Owen_debug store_flag = "+store_flag);
				if(store_flag == 'Google')
				{
					console.log("Google process ");
					oauth2Client.setCredentials(
						{
							refresh_token: refreshToken
						});
					androidpublisher.purchases.subscriptions.get
					(
						{
							packageName: receiptdata["packageName"],
							subscriptionId: receiptdata['productId'],
							token: receiptdata['purchaseToken'],
							auth: oauth2Client
						},
						function(err,data)
						{
							//console.log("Google process 1-1");
							if(err)
							{
								console.log(err);
								return;
							}
							else
							{
								//console.log("Google process 1-2 data['autoRenewing'] = "+data['autoRenewing']);
								if(data['autoRenewing'])
								{
									console.log("Google process");
									startTime = new Date(startTime);
									startTime.setTime(startTime.getTime()+(30 * 24 * 60 * 60 * 1000));
									endTime = new Date(endTime);
									endTime.setTime(endTime.getTime()+(30 * 24 * 60 * 60 * 1000));
								
									var renewData = {
										user_name : user_name,
										device_ID : device_ID,
										product_ID : productId,
										start_Date : startTime,
										end_Date : endTime,
										store : store_flag,
										receipt_data : JSON.stringify(receiptdata),
										package_name : packageName
									};
									console.log("renewData = \n"+ JSON.stringify(renewData));
									couchbase.insertPurchasedData(renewData, 
										function(err, data)
										{
											if(err)
											{
												console.log("updating DB error!");
												ret = 
												{
													status: statusCode['fail'],
												}
												res.statusCode = 500;
											}
											else
											{
												console.log("updating DB success!!!");
												ret = 
												{
													status: statusCode['pass'],
												}
												res.statusCode = 200;
											}
											res.send(ret);
											return;
										});
								}
								else
								{
									ret = 
									{
										status: statusCode['pass'],
									}
									res.statusCode = 200;
									res.send(ret);
									return;
								}
							}
						}
					);
				}
				else //Apple
				{
					console.log("Apple process ");
					//console.log(receiptdata);
					var data = 
					{
						'receipt-data' : receiptdata,
						'password'     : apple_password
					}
					var request_body = JSON.stringify(data);
					request(
						{
							uri: apple_varify_server,
							method: 'POST',
							body: request_body,
							headers:
							{
								'content-type': 'application/x-www-form-urlencoded'
								//'content-length': postData.length
							}
						},
						function(err, res, body)
						{
							//console.log(body);
							ret = {
								status : '',
								data : ''
							};
							if(!err)
							{
								try
								{
									body = JSON.parse(body);
									//console.log(body);
									//console.log("productId = "+productId);
									for( var j in body["latest_receipt_info"] )
									{
										
										if(productId == body["latest_receipt_info"][j]["product_id"])
										{
											var apple_expire_time = new Date(JSON.parse(body["latest_receipt_info"][j]["expires_date_ms"]));
											endTime = new Date(endTime);
											if( endTime<=apple_expire_time )
											{
												startTime = endTime;
												endTime = JSON.parse(body["latest_receipt_info"][j]["expires_date_ms"]);
												//console.log("Owen_debug endTime = "+new Date(endTime));
											}
										}
									}
									console.log("Owen_debug before insertDB!");
									var renewData ={
										user_name : user_name,
										device_ID : device_ID,
										product_ID : productId,
										start_Date : startTime,
										end_Date : new Date(endTime),
										store : store_flag,
										receipt_data : receiptdata,
										package_name : packageName
									};
									//console.log(JSON.stringify(renewData));
									
									couchbase.insertPurchasedData(renewData, 
										function(err, data)
										{
											if(err)
											{
												console.log("updating DB error!");
												ret = 
												{
													status: statusCode['fail'],
												}
												res.statusCode = 500;
											}
											else
											{
												console.log("updating DB success!");
												ret = 
												{
													status: statusCode['pass'],
												}
												res.statusCode = 200;
											}
											res.send(ret);
											return;
										});
								} catch(ex){
									console.log(ex);
								}
							} else{
								console.log("apple request \n\n err ="+err);
								ret.status = statusCode[1];
								ret.data = err;
							}
						}
					);
				}
			}
			//console.log(data);
		});
}

exports.renew = renew_purchased_product;

var renew_recursive = function(pkgName, data, count, res, nextFCT)
{
	console.log('pkgName = '+pkgName+' data = '+data+' count = '+count);
	if(count < 0)
	{
		console.log("renew_recursive done!")
		return;
	}
	else
	{
		//console.log("renew_recursive count = "+count);
		if(data['product']['product_list'][count]['store'] == 'Google' && (pkgName == data['product']['product_list'][count]['package_name']))
		{
			var user_name = data['user_name']
			var receiptdata = data['product']['product_list'][count]['receipt_data'];
			var receiptdata = JSON.parse(receiptdata);
			var device_ID = data['product']['product_list'][count]['device_ID'];
			var store_flag = data['product']['product_list'][count]['store'];
			var productId = data['product']['product_list'][count]['product_ID'];
			var startTime = data['product']['product_list'][count]['start_Date'];
			var endTime = data['product']['product_list'][count]['end_Date'];
			var packageName = data['product']['product_list'][count]['package_name'];
			//console.log('receiptdata = '+receiptdata+' store_flag = ' +store_flag+ 'productId = '+productId+'startTime = '+startTime+'endTime = '+endTime+'packageName = '+packageName);
			
			console.log("Google process ");
			oauth2Client.setCredentials(
			{
				refresh_token: refreshToken
			});
			
			androidpublisher.purchases.subscriptions.get
			(
				{
					packageName: receiptdata["packageName"],
					subscriptionId: receiptdata['productId'],
					token: receiptdata['purchaseToken'],
					auth: oauth2Client
				},
				function(err,data)
				{
					//console.log("Google process 1-1");
					if(err)
					{
						console.log(err);
						return;
					}
					else
					{
						//console.log("Google process 1-2 data['autoRenewing'] = "+data['autoRenewing']);
						if(data['autoRenewing'])
						{
							console.log("Google process");
							startTime = new Date(startTime);
							startTime.setTime(startTime.getTime()+(30 * 24 * 60 * 60 * 1000));
							endTime = new Date(endTime);
							endTime.setTime(endTime.getTime()+(30 * 24 * 60 * 60 * 1000));
						
							var renewData = {
								user_name : user_name,
								device_ID : device_ID,
								product_ID : productId,
								start_Date : startTime,
								end_Date : endTime,
								store : store_flag,
								receipt_data : JSON.stringify(receiptdata),
								package_name : packageName
								};
								
							console.log("renewData = \n"+ JSON.stringify(renewData));
							couchbase.insertPurchasedData(renewData, 
									function(err, data)
									{
										if(err)
										{
											console.log("updating DB error!");
											ret = 
											{
												status: statusCode['fail'],
											}
											G_res.statusCode = 500;
											G_res.send(ret);
											return;
										}
										else
										{
											console.log("updating DB success!");
											ret = 
											{
												status: statusCode['all_pass'],
											}
											G_res.statusCode = 200;
											if(G_count == 0)
											{
												G_res.send(ret);
											}
										}
										nextFCT(G_pkgName, G_data, G_count-- , G_res, renew_recursive);
									});
						}
						else
						{
							ret = 
							{
								status: statusCode['all_pass'],
							}
							G_res.statusCode = 200;
							if(G_count == 0)
							{
								G_res.send(ret);
							}
							nextFCT(G_pkgName, G_data, G_count-- , G_res, renew_recursive);
						}
					}
				}
			);
		}
		else if(data['product']['product_list'][count]['store'] == 'Apple' && (pkgName == data['product']['product_list'][count]['package_name']))
		{
			var receiptdata = data["product"]["product_list"][count]["receipt_data"];
			var store_flag = data['product']['product_list'][count]['store'];
			var startTime = data["product"]["product_list"][count]["start_Date"];
			var endTime = data["product"]["product_list"][count]["end_Date"];
			var productId = data["product"]["product_list"][count]["product_ID"];
			var packageName = data['product']['product_list'][count]['package_name'];
//			console.log('receiptdata = '+receiptdata+' store_flag = ' +store_flag+ 'productId = '+productId+'startTime = '+startTime+'endTime = '+endTime+'packageName = '+packageName);
			console.log("Apple process ");
			//console.log(receiptdata);
			var data = 
			{
				'receipt-data' : receiptdata,
				'password'     : apple_password
			}
			var request_body = JSON.stringify(data);
			request(
				{
					uri: apple_varify_server,
					method: 'POST',
					body: request_body,
					headers:
					{
						'content-type': 'application/x-www-form-urlencoded'
						//'content-length': postData.length
					}
				},
				function(err, res, body)
				{
					//console.log(body);
					ret = {
						status : '',
						data : ''
					};
					if(!err)
					{
						try
						{
							body = JSON.parse(body);
							//console.log(body);
							//console.log("productId = "+productId);
							for( var j in body["latest_receipt_info"] )
							{
								
								if(productId == body["latest_receipt_info"][j]["product_id"])
								{
									var apple_expire_time = new Date(JSON.parse(body["latest_receipt_info"][j]["expires_date_ms"]));
									endTime = new Date(endTime);
									if( endTime<=apple_expire_time )
									{
										startTime = endTime;
										endTime = JSON.parse(body["latest_receipt_info"][j]["expires_date_ms"]);
										//console.log("Owen_debug endTime = "+new Date(endTime));
									}
								}
							}
							console.log("Owen_debug before insertDB!");
							var renewData ={
								user_name : user_name,
								device_ID : device_ID,
								product_ID : productId,
								start_Date : startTime,
								end_Date : new Date(endTime),
								store : store_flag,
								receipt_data : receiptdata,
								package_name : packageName
							};
							//console.log(JSON.stringify(renewData));
							
							couchbase.insertPurchasedData(renewData, 
								function(err, data)
								{
									if(err)
									{
										console.log("updating DB error!");
										ret = 
										{
											status: statusCode['fail'],
										}
										res.statusCode = 500;
										G_res.send(ret);
										return;
									}
									else
									{
										console.log("updating DB success!");
										ret = 
										{
											status: statusCode['all_pass'],
										}
										res.statusCode = 200;
										if(G_count == 0)
										{
											G_res.send(ret);
										}
										nextFCT(G_pkgName, G_data, G_count-- , G_res, renew_recursive);
									}
								});
						} catch(ex){
							console.log(ex);
						}
					} else{
						console.log("apple request \n\n err ="+err);
						ret.status = statusCode[1];
						ret.data = err;
					}
				}
			);
		}
		else
		{
			console.log("invalid DBdata!");
			ret = 
			{
				status: statusCode['all_pass'],
			}
			res.statusCode = 200;
			if(G_count == 0)
			{
				G_res.send(ret);
			}
			nextFCT(G_pkgName, G_data, G_count -- , G_res, renew_recursive);
		}
		
	}
	//nextFCT(pkgName, data, count - 1 , res, renew_recursive);
}

var renew_all_purchased_product = function(body, res)
{
	console.log('renew_all_purchased_product start!');
	
	var token = body.token;
	var user_name = body.user_name;
	if(body.package_name)
	{
		packageName = body.package_name;
	}
	console.log("renew_all_purchased_product packageName = "+packageName+" user_name = "+user_name);
	var couchBaseDataObj;

	var ret;
	
	couchbase.getData(user_name+'_Purchased_Product',
		function(err, data)
		{
			if(err)
			{
				console.log("couchbase.getData() have some error!");
				return;
			}
			if(data)
			{
				couchBaseDataObj = JSON.parse(data);				
				console.log(couchBaseDataObj);
				G_pkgName = packageName;
				G_data = couchBaseDataObj;
				G_count = couchBaseDataObj["product"]["product_list"].length - 1;
				G_res = res;
				renew_recursive(packageName, couchBaseDataObj, G_count, res, renew_recursive);
			}
		});
}

exports.renewall = renew_all_purchased_product;
