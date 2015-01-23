var limiter = require("simple-rate-limiter");
var couchBase = require("./Couchbase");
var fs = require("fs");
var dotEnv = require("dotenv");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);
var packageName = env.PACKAGE_NAME;

var UPDATE_INTERVAL = 1000 * 60 * 60 * 24; // 24hr -> ms
var RenewProduct = require('./BillingRenewPurchasedProduct');

var renew_all_purchased_product_in_service = function(user_name)
{
	console.log('renew_all_purchased_product start! service~');
	
	//var user_name = body.user_name;
	console.log("renew_all_purchased_product packageName = "+packageName);
	var couchBaseDataObj;

	var ret;

	if( user_name == '' )
	{
		ret = 
		{
			status: statusCode['missing'],
		}
		res.statusCode = 400;
		res.send(ret);
		return;
	}

	couchBase.getData(user_name/*+"_Purchased_Product"*/,
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
				
				var updateLimiter = limiter(RenewProduct.renew).to(1).per(100);
				
				for(var i in couchBaseDataObj['product']['product_list'])
				{
						var param ={
							token : token,
							user_name : user_name,
							device_ID : couchBaseDataObj['product']['product_list'][i]['device_ID']
						};
						//console.log(param);
						updateLimiter(param, res);
				}
			}
		});
}

var RenewService = function()
{
	
	couchBase.getUser_NAME(function(err, DBbaseInfo)
		{
			if(err)
			{
				console.log("couchBase.getUser_NAME have some error!");
				return;
			}
			if(DBbaseInfo)
			{
				var updateLimiter = limiter(renew_all_purchased_product_in_service).to(1).per(100);
				for(var i in DBbaseInfo['rows'])
				{
					//console.log(DBbaseInfo['rows'][i]['id']);
					updateLimiter( DBbaseInfo['rows'][i]['id'] );
				}
			}
		});
	
	console.log('Renew product service start!');
}

RenewService();

var dailyRun = setInterval(RenewService, UPDATE_INTERVAL);
