var billingPurchasingStat = require('./BillingPurchasingStat'),
	couchBase = require("./Couchbase");
	iap = require('in-app-purchase');

var fs = require("fs"),
	dotEnv = require("dotenv"),
	file = fs.readFileSync(__dirname + "/.env"),
	env = dotEnv.parse(file);

var BlackCloudLogger = require("../../utils/BlackloudLogger"),
	logger = BlackCloudLogger.new(env.PROJECT_NAME, "BillingVerifyReceipt");

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

iap.config({
	googlePublicKeyPath: './'
});

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
    		BlackCloudLogger.log(logger, "error", "Error on iap setup");
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
    			BlackCloudLogger.log(logger, "error", "Error on apple receipt verification");
				response.statusCode = 500;
				response.send(ret);
			}
			if(iap.isValidated(res)) {
				//console.log(res);
				// erase purchasing state
				billingPurchasingStat.cancel(deviceID);
				// insert data to couchbase db
				packageName = res.receipt.bid;
				productID = res.receipt.product_id;
				var dateObj = getDateString(Number(res.receipt.original_purchase_date_ms));
				var insertData = {
					user_ID        : userID, 
					product        : 
					{
						product_list   : 
						{
							device_ID      : deviceID, 
							product_ID     : productID, 
							start_Date     : dateObj.startDate, 
							end_Date       : dateObj.endDate, 
							store          : 'Apple', 
							receipt_data   : receiptData, 
							apple_password : applePassword, 
							package_name   : packageName 
						}
					}
				}
				couchBase.insertData(userID + '_Purchased_Product', insertData);
				// insert data to couchbase db  end

				// prepare return value
				ret = {
					status: statusCode['apple_pass'], 
				}
    			BlackCloudLogger.log(logger, "info", "Done verifying apple receipt");
				response.statusCode = 200;
				response.send(ret);
			}
		});
	});
}

var verify_receipt_apple_renew = function(receipt_data, password, callback)
{
	var data = {
		'receipt-data' : receipt_data, 
		'password'     : password
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
            } catch (ex) {
				console.log(ex);
            }
        } else {
			//console.log(err);
			ret.status = statusCode[1];
			ret.data = err;
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
		"data" : receiptData, 
		"signature" : googleSignature
	}

	iap.setup(function(error) {
		if(error) {
			var tmpStatus = statusCode['fail'];
			tmpStatus.message += ('. ' + error);
			ret = {
				status: tmpStatus, 
			}
    		BlackCloudLogger.log(logger, "error", "Error on iap setup");
			response.statusCode = 500;
			response.send(ret);
		}
		iap.validate(iap.GOOGLE, googleReceipt, function(err, res) {
			if(err) {
				var tmpStatus = statusCode['fail'];
				tmpStatus.message += ('. ' + error);
				ret = {
					status: tmpStatus, 
				}
    			BlackCloudLogger.log(logger, "error", "Error on google receipt verification");
				response.statusCode = 500;
				response.send(ret);
			}
			if(iap.isValidated(res)) {
				// erase purchasing state
				billingPurchasingStat.cancel(deviceID);
				/* insert data to couchbase db */
				// get date time first
				var dateObj = getDateString(res.purchaseTime);
				var insertData = {
					user_ID        : userID, 
					product        :
					{
						product_list   : 
						[
							{
								device_ID      : deviceID, 
								product_ID     : productID, 
								start_Date     : dateObj.startDate, 
								end_Date       : dateObj.endDate, 
								store          : 'Google', 
								receipt_data   : receiptData, 
								package_name   : packageName 
							}
						]
					}
				}
				couchBase.insertData(userID + '_Purchased_Product', insertData);
				/* insert data to couchbase db   end */

				ret = {
					status: statusCode['google_pass'], 
				}
				//console.log(res);
    			BlackCloudLogger.log(logger, "info", "Done verifying google receipt");
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

exports.apple  = verify_receipt_apple;
exports.apple_renew = verify_receipt_apple_renew;
exports.google = verify_receipt_google;
