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
var logger = BlackCloudLogger.new("WEATHER", "WeatherHttpServer");

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

/* GET forecast. */
router.get("/forecastweather", clientAuthentication, parameterCheck, function(req, res) {
    getInfoFromDB(res, req.query.zipcode, "forecast")
        .then(null, getInfoFromWeb);
});

/* GET current. */
router.get("/currentweather", clientAuthentication, parameterCheck, function(req, res) {
    getInfoFromDB(res, req.query.zipcode, "current")
        .then(null, getInfoFromWeb);
});

module.exports = router;
