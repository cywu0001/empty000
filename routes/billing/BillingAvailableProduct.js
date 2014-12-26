var fs = require("fs"),
	dotEnv = require("dotenv"),
	file = fs.readFileSync(__dirname + "/.env"),
	env = dotEnv.parse(file);

var BlackloudLogger = require("../../utils/BlackloudLogger"),
	logger = BlackloudLogger.new(env.PROJECT_NAME, "BillingAvailableProduct"),
	couchBase = require("./Couchbase");

var google = require('googleapis'),
	androidpublisher = google.androidpublisher('v2'),
	OAuth2 = google.auth.OAuth2,
	packageName  = env.PACKAGE_NAME,
	clientID     = env.CLIENT_ID,
	clientSecret = env.CLIENT_SECRET,
	redirectURL  = env.REDIRECT_URL,
	code         = env.CODE,
	refreshToken = env.REFRESH_TOKEN,
	oauth2Client = new OAuth2(clientID, clientSecret, redirectURL);

var statusCode = 
{
	'pass': {
		code: 1211, 
		message: 'Query available product success'
	}, 
	'missing': {
		code: 1400, 
		message: 'Missing parameter'
	}, 
	'nodata': {
		code: 1411, 
		message: 'No data found'
	} 
};

var getAvailableProductFromBlackloud = function(body, response) {
	var packageName = body.package_name;
	var ret;
	
	if( packageName == null || packageName == '' )
	{
    	BlackloudLogger.log(logger, "error", "Missing parameter: packageName");
		ret = {
			status: statusCode['missing'], 
		}
		response.statusCode = 400;
		response.send(ret);
		return;
	}

	couchBase.getData(packageName + '_Available_Product', function(err, data) {
		if( err )
		{
    		BlackloudLogger.log(logger, "error", "Internal server error");
			ret = {
				status: statusCode['nodata'],
				data  : err
			}
			response.statusCode = 500;
		}
		else
		{
			data = JSON.parse(data);
			if( data.product_ID.length > 0 )
			{
    			BlackloudLogger.log(logger, "info", "Get available product list successfully");
				ret = {
					status: statusCode['pass'],
					product: data
				}
			}
			else
			{
				BlackloudLogger.log(logger, "error", "No available product found");
				ret = {
					status: statusCode['nodata']
				};
			}
			response.statusCode = 200
		}
		response.send(ret);
	});
}

var getAvailableProductFromGoogle = function(name, callback) {
	var packageName = name;
	var ret;

	if( packageName == null || packageName == '' )
	{
		ret = {
			status: statusCode['missing'], 
		}
		return;
	}

	oauth2Client.setCredentials({
		refresh_token: refreshToken
	});

	androidpublisher.inappproducts.list({
		packageName: packageName,
		auth: oauth2Client
	}, function(err, res) {
			if(err)
			{
				if(err.message.indexOf('Missing') >= 0)
				{
					ret = {
						status: statusCode['missing'], 
						data: err
					}
				}
				else
				{
					ret = {
						status: statusCode['nodata'], 
						data: err
					}
				}
			}
			else
			{
				//console.log(response);
				var productList = [];
				res.inappproduct.forEach(function(entry) {
					productList.push(entry.sku);
				});
				var product = {
					package_name: packageName, 
					product_ID_list: productList
				};
				if( productList.length > 0 )
				{
					ret = {
						status: statusCode['pass'], 
						product: product
					}
				}
				else
				{
					ret = {
						status: statusCode['nodata']
					};
				}
				//console.log(ret);
			}
			if( typeof callback == 'function' && callback != null )
				callback(ret);
		});
}

exports.get = getAvailableProductFromBlackloud;
exports.getAvailableProduct = getAvailableProductFromGoogle;
