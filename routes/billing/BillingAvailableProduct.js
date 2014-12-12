var fs = require("fs");
var dotEnv = require("dotenv");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);

var google = require('googleapis');
var androidpublisher = google.androidpublisher('v2');
var OAuth2 = google.auth.OAuth2;
var packageName  = env.PACKAGE_NAME;
var clientID     = env.CLIENT_ID;
var clientSecret = env.CLIENT_SECRET;
var redirectURL  = env.REDIRECT_URL;
var code         = env.CODE;
var refreshToken = env.REFRESH_TOKEN;
var oauth2Client = new OAuth2(clientID, clientSecret, redirectURL);

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

var available_product = function(body, response) {
	var packageName = body.package_name;
	var ret;

	if( packageName == null || packageName == '' )
	{
		ret = {
			status: statusCode['missing'], 
		}
		response.statusCode = 400;
		response.send(ret);
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
					response.statusCode = 400;
				}
				else
				{
					ret = {
						status: statusCode['nodata'], 
						data: err
					}
					response.statusCode = 500;
				}
				response.send(ret);
			}
			else
			{
				//console.log(response);
				var productList = [];
				response.inappproduct.forEach(function(entry) {
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
					response.statusCode = 200;
				}
				else
				{
					ret = {
						status: statusCode['nodata']
					};
					response.statusCode = 500;
				}
				response.send(ret);
				console.log(ret);
			}
		});
}

exports.get = available_product;
