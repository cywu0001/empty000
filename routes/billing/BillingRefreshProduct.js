var fs = require("fs"),
	dotEnv = require("dotenv"),
	file = fs.readFileSync(__dirname + "/.env"),
	env = dotEnv.parse(file);

var BlackloudLogger = require("../../utils/BlackloudLogger"),
	logger = new BlackloudLogger(env.PROJECT_NAME, "BillingRefreshProduct"),
	couchBase = require("./Couchbase"),
	bap = require('./BillingAvailableProduct'); 

var UPDATE_INTERVAL = 1000 * 60 * 60 * 24; // 24hr -> ms
//var UPDATE_INTERVAL = 1000 * 5; // 12hr -> ms

// Do once when first calling this service.
// or it should wait for a long time to get launched.
dailyRoutine();
// Auto update every 24 hr
var tick = setInterval(dailyRoutine, UPDATE_INTERVAL);

function dailyRoutine() {
	//console.log('Update available product start!');
    logger.log( "info", "Update available product start!");

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
				if(err == 0) logger.log( "info", "insert product list success");
				else logger.log( "info", "insert product list fail");
			});
		}
		else if( res.status.code == 1400 )
    			logger.log( "error", "Missing Parameters!");
		else if( res.status.code == 1411 )
    			logger.log( "info", "No data found!");
			
	});
}

