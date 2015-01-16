var billingPurchasingStat = require('./BillingPurchasingStat'),
	billingPurchaseQuery = require('./BillingPurchaseQuery'),
	couchBase = require("./Couchbase"),
	iap = require('in-app-purchase'),
	request = require('request');

var fs = require("fs"),
	dotEnv = require("dotenv"),
	file = fs.readFileSync(__dirname + "/.env"),
	env = dotEnv.parse(file);

var BlackloudLogger = require("../../utils/BlackloudLogger"),
	logger = new BlackloudLogger(env.PROJECT_NAME, "BillingVerifyReceipt");

var statusCode =
{
	'apple_pass': {
		code: 1212, 
		message: 'Verify Apple receipt success'
	},
	'google_pass': {
		code: 1212, 
		message: 'Verify Google receipt success'
	},
	'fail': {
		code: 1412,
		message: 'Verify receipt failure'
	}
};

var verify_receipt_apple = function(body, response)
{
	var	receiptData   = body.receipt_data, 
		applePassword = body.apple_password,
	    userName      = body.user_name,
		deviceID      = body.device_ID,
		productID     = body.product_ID, 
		packageName   = body.package_name;

	var ret;

	var data = {
		'receipt-data' : receiptData, 
		'password'     : env.APPLE_PASSWORD
	};
    postData = JSON.stringify(data);
    request({
        uri: 'https://' + env.APPLE_VERIFY_SERVER + '/verifyReceipt',
        method: 'POST',
        body: postData,
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            //'content-length': postData.length
        }
    }, function (err, res, body) {
		var ret = {
			status: ''
		};
        if (!err) {
            try {
                body = JSON.parse(body);

	            if (res.statusCode == 200) 
				{
					if(body.status == 0)
					{
						// erase purchasing state
						billingPurchasingStat.cancel(deviceID);
						// database access
						dbUpdate(userName, deviceID, productID, 'Apple', JSON.stringify(body), packageName, Number(body.receipt.original_purchase_date_ms), 
							function(data) {
								//console.log(data);
								ret = JSON.parse(data);
								ret.status = statusCode['apple_pass'];
								response.statusCode = 200;
								response.send(ret);
	    						logger.log( "info", "Done verifying apple receipt");
							}
						);
					}
					else
					{
						ret.status = statusCode['fail'];
						response.statusCode = 500;
						response.send(ret);
    					logger.log( "error", "Fail on verifying apple receipt");
					}
                }
            } catch (ex) {
				console.log(ex);
            }
        } else {
			ret.status = statusCode['fail'];
			response.statusCode = 500;
			response.send(ret);
    		logger.log( "error", "Error on verifying process");
        }
    });
}


var verify_receipt_apple_renew = function(receipt_data, callback)
{
	var data = {
		'receipt-data' : receipt_data, 
		'password'     : env.APPLE_PASSWORD
	};
    postData = JSON.stringify(data);
    request({
        uri: 'https://' + env.APPLE_VERIFY_SERVER + '/verifyReceipt',
        method: 'POST',
        body: postData,
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            //'content-length': postData.length
        }
    }, function (err, res, body) {
		var ret = {
			status: '',
			data  : ''
		};
        if (!err) {
            try {
                body = JSON.parse(body);
                if (res.statusCode == 200) 
				{
					if(body.status == 0)
						ret.status = statusCode[0];
					else
						ret.status = statusCode[1];
                }
				ret.data = body;
    			logger.log( "info", "Done verifying apple renew receipt");
            } catch (ex) {
				console.log(ex);
            }
        } else {
			//console.log(err);
			ret.status = statusCode[1];
			ret.data = err;
    		logger.log( "error", "Fail on verifying apple renew receipt");
        }
		callback(ret);
    });
}

var verify_receipt_google = function(body, response)
{
	var	receiptData     = body.receipt_data, 
		googleSignature = body.signature,
	    userName        = body.user_name,
		deviceID        = body.device_ID,
		productID       = body.product_ID, 
		packageName     = body.package_name;

	var ret;
	var googleReceipt = {
		"data": receiptData, 
		"signature": googleSignature
	}

	iap.config({
		googlePublicKeyPath: env.GOOGLE_PUBLIC_KEY_DIR
	});

	iap.setup(function(error) {
		var ret = {
			status: ''
		};
		if(error) {
			var tmpStatus = statusCode['fail'];
			tmpStatus.message += ('. ' + error);
			ret.status = tmpStatus;
    		logger.log( "error", "Error on iap setup");
			response.statusCode = 500;
			response.send(ret);
		}
		iap.validate(iap.GOOGLE, googleReceipt, function(err, res) {
			if(err) {
				var tmpStatus = statusCode['fail'];
				tmpStatus.message += ('. ' + err);
				ret.status = tmpStatus;
    			logger.log( "error", "Error on google receipt verification : " + err);
				response.statusCode = 500;
				response.send(ret);
			}
			if(iap.isValidated(res)) {
				// erase purchasing state
				billingPurchasingStat.cancel(deviceID);
				// database access
				dbUpdate(userName, deviceID, productID, 'Google', receiptData, packageName, res.purchaseTime, 
					function(data) {
						ret = JSON.parse(data);
						ret.status = statusCode['google_pass'];
						response.statusCode = 200;
						response.send(ret);
    					logger.log( "info", "Done verifying google receipt");
					}
				);
			}
		});
	});
}

function getDateString(date) {
	var startDate = new Date(date), 
		endDate   = new Date();
	endDate.setTime(startDate.getTime() + (30 * 24 * 60 * 60 * 1000));
	var sDateString = startDate.toJSON().split('T')[0].replace(new RegExp('-', 'g'), ''), 
		eDateString = endDate.toJSON().split('T')[0].replace(new RegExp('-', 'g'), '');
	var ret = {
		startDate: sDateString, 
		endDate  : eDateString
	}
	return ret;
}

function dbUpdate(userName, deviceID, productID, store, receiptData, packageName, purchaseTime, callback)
{
	// prepare start date & end date first
	var dateObj = getDateString(purchaseTime);
	/*
	// once user purchases a product, we should delete the trial info first
	var key = deviceID + '_Trial';
	couchBase.getData(key,function(err, data) {
		if(err) 
			logger.log( "error", "trial data not found! " + err);
		else 
			couchBase.deleteData(key);
	});
	*/

	// prepare params for database update (Purchased_Product & Purchased_History) 
	var params = {
		user_name    : userName,
		device_ID    : deviceID,
		product_ID   : productID,
		start_Date   : dateObj.startDate,
		end_Date     : dateObj.endDate,
		store        : store,
		receipt_data : receiptData, 
		package_name : packageName
	};

	// update history data
	// receipt data is useless in history record so insertHistoryData api call will not put it into db
	couchBase.insertHistoryData(params, function(err, data) { 
		if(err) logger.log( 'error', 'insertHistoryData fail! ' + err);
	}); 

	// update purchased product
	// also, we do the query after the purchased product list is updated
	// to reduce api calls during purchasing flow
	couchBase.insertPurchasedData(params, function(err, data) { 
		if(err)
			logger.log( 'error', 'insertPurchasedData fail! ' + err);
		// get data from database to reduce api call latencies.
		billingPurchaseQuery.query_purchased_receipt_product(userName, packageName, function(data) {
			if( typeof callback == 'function' && callback != null )
				callback(data);
		});
	}); 

}

exports.apple  = verify_receipt_apple;
exports.apple_renew = verify_receipt_apple_renew;
exports.google = verify_receipt_google;
