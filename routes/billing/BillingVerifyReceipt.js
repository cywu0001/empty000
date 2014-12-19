var billingPurchasingStat = require('./BillingPurchasingStat'),
	couchBase = require("./Couchbase"),
	iap = require('in-app-purchase'),
	request = require('request');

var fs = require("fs"),
	dotEnv = require("dotenv"),
	file = fs.readFileSync(__dirname + "/.env"),
	env = dotEnv.parse(file);

var BlackloudLogger = require("../../utils/BlackloudLogger"),
	logger = BlackloudLogger.new(env.PROJECT_NAME, "BillingVerifyReceipt");

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
	    userID        = body.user_ID,
		deviceID      = body.device_ID,
		productID     = body.product_ID, 
		packageName   = body.package_name;

	var ret;

	iap.setup(function(error) {
		if(error) {
			var tmpStatus = statusCode['fail'];
			tmpStatus.message += ('. ' + error);
			ret = {
				status: tmpStatus, 
			}
    		BlackloudLogger.log(logger, "error", "Error on iap setup");
			response.statusCode = 500;
			response.send(ret);
		}
		iap.validate(iap.APPLE, receiptData, function(err, res) {
			if(err) {
				var tmpStatus = statusCode['fail'];
				tmpStatus.message += ('. ' + err);
				ret = {
					status: tmpStatus, 
				}
    			BlackloudLogger.log(logger, "error", "Error on apple receipt verification");
				response.statusCode = 500;
				response.send(ret);
			}
			if(iap.isValidated(res)) {
				//console.log(res);
				// erase purchasing state
				billingPurchasingStat.cancel(deviceID);
				packageName = res.receipt.bid;
				productID = res.receipt.product_id;

				// database access
				dbUpdate(userID, deviceID, productID, 'Apple', receiptData, packageName, Number(res.receipt.original_purchase_date_ms));

				// prepare return value
				ret = {
					status: statusCode['apple_pass'], 
				}
    			BlackloudLogger.log(logger, "info", "Done verifying apple receipt");
				response.statusCode = 200;
				response.send(ret);
			}
		});
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
    			BlackloudLogger.log(logger, "info", "Done verifying apple renew receipt");
            } catch (ex) {
				console.log(ex);
            }
        } else {
			//console.log(err);
			ret.status = statusCode[1];
			ret.data = err;
    		BlackloudLogger.log(logger, "error", "Fail on verifying apple renew receipt");
        }
		callback(ret);
    });
}

var verify_receipt_google = function(body, response)
{
	var	receiptData     = body.receipt_data, 
		googleSignature = body.signature,
	    userID          = body.user_ID,
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
		if(error) {
			var tmpStatus = statusCode['fail'];
			tmpStatus.message += ('. ' + error);
			ret = {
				status: tmpStatus, 
			}
    		BlackloudLogger.log(logger, "error", "Error on iap setup");
			response.statusCode = 500;
			response.send(ret);
		}
		iap.validate(iap.GOOGLE, googleReceipt, function(err, res) {
			if(err) {
				var tmpStatus = statusCode['fail'];
				tmpStatus.message += ('. ' + err);
				ret = {
					status: tmpStatus, 
				}
    			BlackloudLogger.log(logger, "error", "Error on google receipt verification");
				response.statusCode = 500;
				response.send(ret);
			}
			if(iap.isValidated(res)) {
				// erase purchasing state
				billingPurchasingStat.cancel(deviceID);
				// database access
				dbUpdate(userID, deviceID, productID, 'Google', receiptData, packageName, res.purchaseTime);
			
				ret = {
					status: statusCode['google_pass'], 
				}
				//console.log(res);
    			BlackloudLogger.log(logger, "info", "Done verifying google receipt");
				response.statusCode = 200;
				response.send(ret);
			}
		});
	});
}

function getDateString(date) {
	var startDate = new Date(date), 
		endDate   = new Date();
	endDate.setDate(startDate.getDate() + 30);
	var sDateString = startDate.toJSON().split('T')[0].replace(new RegExp('-', 'g'), ''), 
		eDateString = endDate.toJSON().split('T')[0].replace(new RegExp('-', 'g'), '');
	var ret = {
		startDate: sDateString, 
		endDate  : eDateString
	}
	return ret;
}

function dbUpdate(userID, deviceID, productID, store, receiptData, packageName, purchaseTime)
{
	// prepare start date & end date first
	var dateObj = getDateString(purchaseTime);
	// query trial data first 
	// if trial exists, then delete it.
	// if not, do nothing.
	var key = deviceID + '_Trial';
	couchBase.getData(key,function(err, data) {
		if(err) 
			BlackloudLogger.log(logger, "error", "trial data not found! " + err);
		else 
			couchBase.deleteData(key);
	});

	// update purchased product 
	var params = {
		user_ID      : userID,
		device_ID    : deviceID,
		product_ID   : productID,
		start_Date   : dateObj.startDate,
		end_Date     : dateObj.endDate,
		store        : store,
		receipt_data : receiptData, 
		package_name : packageName
	};
	couchBase.insertPurchasedData(params, function(err, data) { 
		if(err) BlackloudLogger.log(logger, 'error', 'insertPurchasedData fail! ' + err);
	}); 

	// update history data
	// receipt data is useless in history record, so just remove it.
	couchBase.insertHistoryData(params, function(err, data) { 
		if(err) BlackloudLogger.log(logger, 'error', 'insertHistoryData fail! ' + err);
	}); 
}

exports.apple  = verify_receipt_apple;
exports.apple_renew = verify_receipt_apple_renew;
exports.google = verify_receipt_google;
