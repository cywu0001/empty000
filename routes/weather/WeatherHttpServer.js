var express = require("express");
var router = express.Router();
var fs = require("fs");
var Q = require("q");
var dotEnv = require("dotenv");
var weatherInfo = require("./WeatherInformation");
var couchbase = require("./Couchbase");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);
var BlackCloudLogger = require("../../utils/BlackloudLogger");
var logger = BlackCloudLogger.new(env.PROJECT_NAME, "WeatherHttpServer");

var parammiss = {"status":{"code":1400,"message":"Missing parameter"}};
var paramformaterr = {"status":{"code":1402,"message":"Parameter format error"}};
var authfail = {"status":{"code":1403,"message":"Authentication failure"}};
var zipnotfound = {"status":{"code":1404,"message":"Zip code not found"}};
var dbqueryerr = {"status":{"code":1405,"message":"Database query error"}};
var dbdisconn = {"status":{"code":1406,"message":"Database disconnection"}};
var weaservqueryerr = {"status":{"code":1407,"message":"Weather server query error"}};
var weaservdisconn = {"status":{"code":1408,"message":"Weather information server disconnection"}};

function clientAuthentication(req, res, next) {
    if(req.client.authorized){
        BlackCloudLogger.log(logger, "info", "Authentication success");
        next();
    }else {
        BlackCloudLogger.log(logger, "info", "Authentication failure");
        res.statusCode = 400;
        res.end(JSON.stringify(authfail));
    }
}

function isPositiveInteger(n) {
    return 0 === n % (!isNaN(parseFloat(n)) && 0 <= ~~n);
}

function parameterCheck(req, res, next) {
    if(req.query.zipcode == null) {
        BlackCloudLogger.log(logger, "info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else if(!isPositiveInteger(req.query.zipcode)) {
        BlackCloudLogger.log(logger, "info", "Parameter format error");
        res.statusCode = 400;
        res.end(JSON.stringify(paramformaterr));
    }
    else {
        next(); 
    }
}

//Add for Demo
function demoFunction(req, res, next) {
    if(req.query.zipcode == "98111") {
        couchbase.getData(req.query.zipcode + "_forecast", function(err, data) {
            BlackCloudLogger.log(logger, "info", "Get 98111 zip code for demo");
            info = JSON.parse(data);

            info["data"]["weather"].forEach(function (val, idx) {
                val.precipMM = "1.0";
                val.tempMaxC = "29";
                val.tempMaxF = "85";
                val.tempMinC = "23";
                val.tempMinF = "73";
                val.weatherCode = "386";
                val.suggestWatering = "0";
            });
            res.statusCode = 200;
            res.end(JSON.stringify(info));
        });
    }
	else {
	    next();
    }
}

function getInfoFromDB(response, zipcode, type) {
    var deferred = Q.defer();
    couchbase.getData(zipcode + "_" + type, function(err, data) {
        if(err) {
            BlackCloudLogger.log(logger, "info", "Can't find " + zipcode + "_" + type);
            params = {
                response:response,
                zipcode:zipcode,
                type:type
            };
            deferred.reject(params);
        }
        else {
            BlackCloudLogger.log(logger, "info", "Get weather information success");
            response.statusCode = 200;
            response.end(data);
            deferred.resolve();
        }
    });
    return deferred.promise;
}

function getInfoFromWeb(params) {
    weatherInfo.get(params.zipcode, function(err) {
        BlackCloudLogger.log(logger, "info", err);
        if (err == "completed") {
            couchbase.getData(params.zipcode, function(err, data) {
                getInfoFromDB(params.response, params.zipcode, params.type);
            });  
        }
        else if(err.match("invalid zip code") || err.match("invalid api key")) {
            params.response.statusCode = 400;
            params.response.end(JSON.stringify(zipnotfound));        
        }
        else if (err == "server error" || err == "parse error") {
            params.response.statusCode = 500;
            params.response.end(JSON.stringify(weaservqueryerr));
        }
        else if (err == "database error") {
            params.response.statusCode = 500;
            params.response.end(JSON.stringify(dbqueryerr));
        }
    });
}

function readUploadFile(req,res,type)
{
	var obj;
	res.end("File uploaded.");
	fs.readFile('./uploads/temp', 'utf8', function (err, data) {
	if (err) throw err;
	console.log("zip code:\n"+req.query.zipcode);
	//console.log("get file:\n"+data);

	couchbase.replaceData(req.query.zipcode+"_"+type,data,function (err, data) {
		if (err)
		{ 
			console.log("get some error:\n",err);
		}
		if(data)
		{
			console.log(data);
		}
	});
	});
}

/* GET server version. */
router.get("/server_version", function(req, res) {
    res.statusCode = 200;
    res.end(env.SERVER_VERSION);
});

/* GET forecast. */
router.get("/forecastweather", clientAuthentication, parameterCheck, demoFunction, function(req, res) {
    getInfoFromDB(res, req.query.zipcode, "forecast")
        .then(null, getInfoFromWeb);
});

/* GET current. */
router.get("/currentweather", clientAuthentication, parameterCheck, function(req, res) {
    getInfoFromDB(res, req.query.zipcode, "current")
        .then(null, getInfoFromWeb);
});

/* POST forecast. */
router.post("/forecastweather", clientAuthentication, parameterCheck, function(req, res) {
    console.log("forecastweather post");
    readUploadFile(req,res,"forecast");
});

/* POST current. */
router.post("/currentweather", clientAuthentication, parameterCheck, function(req, res) {
    console.log("currentweather post");
    readUploadFile(req,res,"current");
});

module.exports = router;
