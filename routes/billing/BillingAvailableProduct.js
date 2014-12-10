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
[
	{
		code: 1211, 
		message: 'Query available product success'
	}, 
	{
		code: 1400, 
		message: 'Missing parameter'
	}, 
	{
		code: 1411, 
		message: 'No data found'
	} 
];

var available_product = function(body, fail, pass) {
	var access_token = body.access_token;
	var packageName = body.package_name;
	var ret;

	if( access_token == null || access_token == '' || packageName == null || packageName == '' )
	{
		ret = {
			status: statusCode[1], 
		}
		if(typeof fail == 'function' && fail != null ) 
			fail(ret);
		return;
	}

	oauth2Client.setCredentials({
		token: access_token,
		refresh_token: refreshToken
	});

	androidpublisher.inappproducts.list({
		packageName: packageName,
		auth: oauth2Client
	}, function(err, response) {
			if(err)
			{
				if(err.message.indexOf('Missing') >= 0)
				{
					ret = {
						status: statusCode[1], 
						data: err
					}
				}
				else
				{
					ret = {
						status: statusCode[2], 
						data: err
					}
				}
				if(typeof fail == 'function' && fail != null ) 
					fail(ret);
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
						status: statusCode[0], 
						product: product
					}
				}
				else
				{
					ret = {
						status: statusCode[2]
					};
				}
				if(typeof pass == 'function' && pass != null ) 
					pass(ret);
				console.log(ret);
			}
		});
}

exports.get = available_product;
