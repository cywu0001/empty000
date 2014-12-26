var fs = require("fs");
var dotEnv = require("dotenv");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);

var BlackloudLogger = require("../../utils/BlackloudLogger");
var logger = BlackloudLogger.new(env.PROJECT_NAME, "BillingRefreshProduct");
var couchBase = require("./Couchbase");
var bap = require('./BillingAvailableProduct'); 

var UPDATE_INTERVAL = 1000 * 60 * 60 * 24; // 24hr -> ms
//var UPDATE_INTERVAL = 1000 * 5; // 12hr -> ms

// Do once when first calling this service.
// or it should wait for a long time to get launched.
dailyRoutine();
// Auto update every 24 hr
var tick = setInterval(dailyRoutine, UPDATE_INTERVAL);

function dailyRoutine() {
	console.log('Update available product start!');
    BlackloudLogger.log(logger, "info", "Update available product start!");

	var packageName = 'com.test.testsample';
	var res;
	bap.getAvailableProduct(packageName, function(res) {
		if( res.status.code == 1211 )
		{
			var insertData = {
				package_name   : packageName, 
				product_ID     : res.product.product_ID_list 
			}
			couchBase.insertData(packageName + '_Available_Product', insertData, function(err) {
				if(err == 0) BlackloudLogger.log(logger, "info", "insert product list success");
				else BlackloudLogger.log(logger, "info", "insert product list fail");
			});
		}
		else if( res.status.code == 1400 )
    			BlackloudLogger.log(logger, "error", "Missing Parameters!");
		else if( res.status.code == 1411 )
    			BlackloudLogger.log(logger, "info", "No data found!");
			
	});
}

