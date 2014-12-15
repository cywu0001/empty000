var fs = require("fs");
var dotEnv = require("dotenv");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);
var couchbase = require("./Couchbase");
var merge = require('merge');

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


var couchbase_result = function (err, data) {
        console.log("callback function:result\n");
    if (err)
        {
                console.log("get some error:\n",err);
        }
        if(data)
        {
        console.log(data);
        }
};

var statusCode =
{
        'pass':{
                code: 1219,
                message: 'Renew purchased product success'
        },
        'missing':{
                code: 1400,
                message: 'Missing parameter'
        },
        /*'not found':{
                code: 1401,
                message: 'Parameter not found'
        },*/
        /*'format error':{
                code: 1402,
                message: 'Parameter format error'
        },*/
        /*'auth error':{
                code: 1403,
                message: 'Authentication failure'
        },*/
        'nodata':{
                code: 1411,
                message: 'No data found'
        },
        'fail':{
                code: 1414,
                message: 'Fail to renew purchasing'
        }
};


var renew_purchased_product = function(body, response)
{

	var access_token = body.access_token;
        var packageName = body.package_name;
	var subscriptionId = body.subscriptionId;
	var token = body.token;
        var ret;

        oauth2Client.setCredentials({
                token: access_token,
                refresh_token: refreshToken
        });


	androidpublisher.purchases.subscriptions.get({
		packageName: packageName,
		subscriptionId:subscriptionId,
		token:token,
		auth: oauth2Client
	},function(err,res){

		if(err)
		{
			console.log(err);
		
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
		}
		else
		{
			response = {
				"kind": res.kind,
				"startTimeMillis": res.startTimeMillis,
				"expiryTimeMillis": res.expiryTimeMillis,
				"autoRenewing": res.autoRenewing,
				"status": statusCode['pass'], 
                        	"statusCode" : 200
			}

                       	couchbase.insertData('Owen_test',response,couchbase_result);
			console.log(response);
		}

	});

}
exports.get = renew_purchased_product;

var renew_all_purchased_product = function(body, response)
{
	var access_token = body.access_token;
        var packageName = body.package_name;
        var subscriptionId = body.subscriptionId;
        var token = body.token;
        var ret;
	
        oauth2Client.setCredentials({
                token: access_token,
                refresh_token: refreshToken
        });

	for(var i in body.deviceID)
	{

		androidpublisher.purchases.subscriptions.get({
                	packageName: packageName,
                	subscriptionId:subscriptionId,
                	token:token,
                	auth: oauth2Client
        	},function(err,res){
			if(err)
                	{
                        	console.log(err);

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
                	}
			else
                	{
                        	response = {
					"userID" : body.userid,
					"deviceID" : body.deviceid,
                                	"kind": res.kind,
                                	"startTimeMillis": res.startTimeMillis,
                                	"expiryTimeMillis": res.expiryTimeMillis,
                                	"autoRenewing": res.autoRenewing,
                                	"status": statusCode['pass'],
                                	"statusCode" : 200
                       		}

                        	couchbase.insertData('Owen_test',response,couchbase_result);
                        	console.log(response);
                	}
		});
	}
		
}
exports.allget = renew_purchased_product;
