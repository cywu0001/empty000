var fs = require("fs");
var dotEnv = require("dotenv");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);
var couchbase = require("./Couchbase");
var merge = require('merge');
var request = require('request');

var google = require('googleapis');
var androidpublisher = google.androidpublisher('v2');

var packageName = env.PACKAGE_NAME;
var clientID = env.CLIENT_ID;
var clientSecret = env.CLIENT_SECRET;
var redirectURL = env.REDIRECT_URL;
var code = env.CODE;
var refreshToken = env.REFRESH_TOKEN;

var apple_password = env.APPLE_PASSWORD;

var OAuth2 = google.auth.OAuth2;
var oauth2Client = new OAuth2(clientID, clientSecret, redirectURL);

var statusCode = 
{
	'pass':
	{
		code:1219,
		message:'Renew purchased product success'
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

	if( token == '' || user_name == '' || device_ID == '')
	{
		ret = 
		{
			status: statusCode['missing'],
		}
		res.statusCode = 400;
		res.send(ret);
		return;
	}

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
				
				for( var i in couchBaseDataObj['product']['product_list'])
				{
					if( device_ID == couchBaseDataObj['product']['product_list'][i]['device_ID'])
					{
						if(couchBaseDataObj['product']['product_list'][i]['store'] == 'Google')
						{
							receiptdata = couchBaseDataObj['product']['product_list'][i]['receipt_data'];
							receiptdata = JSON.parse(receiptdata);
							store_flag = couchBaseDataObj['product']['product_list'][i]['store'];
						}
						else//(couchBaseDataObj['product']['product_list'][i]['store'] == 'Apple')
						{
							receiptdata = couchBaseDataObj["product"]["product_list"][i]["receipt_data"];
							store_flag = couchBaseDataObj['product']['product_list'][i]['store'];
							//startTime = couchBaseDataObj["product"]["product_list"][i]["start_Date"];
							endTime = couchBaseDataObj["product"]["product_list"][i]["end_Date"];
							productId = couchBaseDataObj["product"]["product_list"][i]["product_ID"];
						}
					}
				}
				if(store_flag == 'Google')
				{
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
							if(err)
							{
								console.log(err);
								return;
							}
							else
							{
								if(data['autoRenewing'])
								{
									for( var i in couchBaseDataObj['product']['product_list'])
									{
										if( device_ID == couchBaseDataObj['product']['product_list'][i]['device_ID'])
										{
											couchBaseDataObj['product']['product_list'][i]['start_Date'] = new Date(couchBaseDataObj['product']['product_list'][i]['start_Date']);
											couchBaseDataObj['product']['product_list'][i]['start_Date'].setTime(couchBaseDataObj['product']['product_list'][i]['start_Date'].getTime()+ (30 * 24 * 60 * 60 * 1000));
											couchBaseDataObj['product']['product_list'][i]['end_Date'] = new Date(couchBaseDataObj['product']['product_list'][i]['end_Date']);
											couchBaseDataObj['product']['product_list'][i]['end_Date'].setTime(couchBaseDataObj['product']['product_list'][i]['end_Date'].getTime()+ (30 * 24 * 60 * 60 * 1000));
										}
									}
									couchbase.insertData(user_name+"_Purchased_Product",couchBaseDataObj,
									function(err,data)
									{
										if(err)
										{
											ret = 
											{
												status: statusCode['fail'],
											}
											res.statusCode = 500;
										}
										else
										{
											ret = 
											{
												status: statusCode['pass'],
											}
											res.statusCode = 200;
										}
									});
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
							uri: 'https://sandbox.itunes.apple.com/verifyReceipt',
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
									for( var j in body["latest_receipt_info"] )
									{
										if(productId == body["latest_receipt_info"][j]["product_id"])
										{
											var apple_expire_time = new Date(body["latest_receipt_info"][j]["expires_date_ms"]);
											endTime = new Date(endTime);
											if( (endTime.getDate() <= apple_expire_time.getDate()) && (endTime.getMonth()+1 <= apple_expire_time.getMonth()+1) && (endTime.getYear() <= apple_expire_time.getYear()) )
											{
												startTime = body["latest_receipt_info"][j]["purchase_date_ms"];
												endTime = body["latest_receipt_info"][j]["expires_date_ms"];
											}
										}
									}
									for (var k in couchBaseDataObj["product"]["product_list"])
									{
										if( device_ID == couchBaseDataObj["product"]["product_list"][k]["device_ID"])
										{
											couchBaseDataObj["product"]["product_list"][k]["start_Date"] = startTime;
											couchBaseDataObj["product"]["product_list"][k]["end_Date"] = endTime;
											couchbase.insertData(user_name+"_Purchased_Product", couchBaseDataObj,
												function(err,data)
												{
													if(err)
													{
														ret = 
														{
															status: statusCode['fail'],
														}
														res.statusCode = 500;
													}
													else
													{
														ret = 
														{
															status: statusCode['pass'],
														}
														res.statusCode = 200;
														console.log("Owen apple done");
													}
												});
										}
									}
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

var renew_all_purchased_product = function(body, res)
{
	console.log('renew_all_purchased_product start!');
	var token = body.token;
	var user_name = body.user_name;
	var package_name = body.package_name;
	var productId;
	
	var couchBaseDataObj;
	var receiptdata;
	var store_flag;
	var startTime;
	var endTime;

	var ret;

	if( token == '' || user_name == '' || package_name == '')
	{
		ret = 
		{
			status: statusCode['missing'],
		}
		res.statusCode = 400;
		res.send(ret);
		return;
	}
	
	couchbase.getData(user_name+"_Purchased_Product",
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
				for(var i in couchBaseDataObj['product']['product_list'])
				{
					if(package_name == couchBaseDataObj['product']['product_list'][i]['package_name'])
					{
						if(couchBaseDataObj['product']['product_list'][i]['store'] == 'Google')
						{
						
							receiptdata = couchBaseDataObj['product']['product_list'][i]['receipt_data'];
							receiptdata = JSON.parse(receiptdata);
							
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
									if(err)
									{
										console.log(err);
										return;
									}
									else
									{
										if(data['autoRenewing'])
										{
											couchBaseDataObj['product']['product_list'][i]['start_Date'] = new Date(couchBaseDataObj['product']['product_list'][i]['start_Date']);
											couchBaseDataObj['product']['product_list'][i]['start_Date'].setTime(couchBaseDataObj['product']['product_list'][i]['start_Date'].getTime()+ (30 * 24 * 60 * 60 * 1000));
											couchBaseDataObj['product']['product_list'][i]['end_Date'] = new Date(couchBaseDataObj['product']['product_list'][i]['end_Date']);
											couchBaseDataObj['product']['product_list'][i]['end_Date'].setTime(couchBaseDataObj['product']['product_list'][i]['end_Date'].getTime()+ (30 * 24 * 60 * 60 * 1000));
											couchbase.insertData(user_name+"_Purchased_Product", couchBaseDataObj,
												function(err,data)
												{
													if(err)
													{
														ret ={ status: statusCode['fail'], }
														res.statusCode = 500;
													}
													else
													{
														ret = { status: statusCode['pass'], }
														res.statusCode = 200;
														console.log("Owen apple done");
													}
												}
											);
										}
									}
								}
							);
						}
						else//apple
						{
							receiptdata = couchBaseDataObj["product"]["product_list"][i]["receipt_data"];
							//store_flag = couchBaseDataObj['product']['product_list'][i]['store'];
							//startTime = couchBaseDataObj["product"]["product_list"][i]["start_Date"];
							endTime = couchBaseDataObj["product"]["product_list"][i]["end_Date"];
							productId = couchBaseDataObj["product"]["product_list"][i]["product_ID"];
							
							var data = 
							{
								'receipt-data' : receiptdata,
								'password'     : apple_password
							}
							var request_body = JSON.stringify(data);
							request(
								{
									uri: 'https://sandbox.itunes.apple.com/verifyReceipt',
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
											for( var j in body["latest_receipt_info"] )
											{
												if(productId == body["latest_receipt_info"][j]["product_id"])
												{
													var apple_expire_time = new Date(body["latest_receipt_info"][j]["expires_date_ms"]);
													endTime = new Date(endTime);
													if( (endTime.getDate() <= apple_expire_time.getDate()) && (endTime.getMonth()+1 <= apple_expire_time.getMonth()+1) && (endTime.getYear() <= apple_expire_time.getYear()) )
													{
														startTime = body["latest_receipt_info"][j]["purchase_date_ms"];
														endTime = body["latest_receipt_info"][j]["expires_date_ms"];
														couchBaseDataObj["product"]["product_list"][i]["start_Date"] = startTime;
														couchBaseDataObj["product"]["product_list"][i]["end_Date"] = endTime;
														couchbase.insertData(user_name+"_Purchased_Product", couchBaseDataObj,
															function(err,data)
															{
																if(err)
																{
																	ret ={ status: statusCode['fail'], }
																	res.statusCode = 500;
																}
																else
																{
																	ret = { status: statusCode['pass'], }
																	res.statusCode = 200;
																	console.log("Owen apple done");
																}
															}
														);
													}
												}
											}
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
				}				
			}
		});
}

exports.renewall = renew_all_purchased_product;