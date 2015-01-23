var limiter = require("simple-rate-limiter");
var couchBase = require("./Couchbase");
var fs = require("fs");
var dotEnv = require("dotenv");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);
var packageName = env.PACKAGE_NAME;

var UPDATE_INTERVAL = 1000 * 60 * 60 * 24; // 24hr -> ms
var RenewProduct = require('./BillingRenewPurchasedProduct');
var callback_count;

var renewall_callback = function(count, nameOBJ, nextFCT)
{
	//console.log("renewall_callback count = ",count);
	if(count<0)
	{
		console.log("renewall_callback done!");
		return;
	}
	else
	{
		console.log("count = "+count+" nameOBJ = "+nameOBJ['rows'][count]['id'].substring( 0,nameOBJ['rows'][count]['id'].indexOf("_Purchased_Product")));
		
		var res;
		RenewProduct.renewall(body = { user_name : nameOBJ['rows'][count]['id'].substring( 0,nameOBJ['rows'][count]['id'].indexOf("_Purchased_Product")) }, res);
	}
	nextFCT(callback_count--, nameOBJ, renewall_callback);
}

var RenewService = function()
{
	console.log('Renew product service start!');
	couchBase.getUser_NAME(function(err, DBbaseInfo)
		{
			if(err)
			{
				console.log("couchBase.getUser_NAME have some error!");
				return;
			}
			if(DBbaseInfo)
			{
				//console.log(" DBbaseInfo['rows'].length = "+ DBbaseInfo['rows'].length);
				callback_count= DBbaseInfo['rows'].length-1;
				renewall_callback(callback_count, DBbaseInfo, renewall_callback);
			}
			else
			{
				console.log("couchBase.getUser_NAME have some error");
			}
		});
}

RenewService();

var dailyRun = setInterval(RenewService, UPDATE_INTERVAL);
