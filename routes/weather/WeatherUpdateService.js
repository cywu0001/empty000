var fs = require("fs");
var time = require("time");
var waterfall = require("async-waterfall");
var limiter = require("simple-rate-limiter");
var dotEnv = require("dotenv");
var weatherInfo = require("./WeatherInformation");
var couchbase = require("./Couchbase");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);
var BlackloudLogger = require("../../utils/BlackloudLogger");
var logger = new BlackloudLogger(env.PROJECT_NAME, "WeatherUpdateService");
var logEnable = true;

/*
 * ==================================================
 *             Calculate next timing
 * ==================================================
 */

//Now time in west 
var current = new time.Date();
var currentTime = Math.floor(new time.Date()/1000);

//midnight in west
var midnight = new time.Date(current.getFullYear(), current.getMonth(), current.getDate());
var midnightTime = Math.floor(midnight/1000);

if(logEnable) {
	logger.log("info", "env.UPDATE_TIMING: " + parseFloat(env.UPDATE_TIMING));
	logger.log("info", "env.UPDATE_INTERVAL: " + parseInt(env.UPDATE_INTERVAL));
	logger.log("info", "current time: " + current + " " + currentTime);
	logger.log("info", "midnight time: " + midnight + " " + midnightTime);
}

//ex.2:00 ___ 14:00 ___ 2:00
var updateTiming = parseFloat(env.UPDATE_TIMING);
var first = midnightTime + (updateTiming * 60 * 60);
var second = midnightTime + ((12 + updateTiming) * 60 * 60);
var third = midnightTime + ((24 + updateTiming) * 60 * 60);

//Calculate offset for first timing
var offset;
if(first > currentTime) {
	offset = first - currentTime;
}
else if(second > currentTime) {
	offset = second - currentTime;
}
else if(third > currentTime) {
	offset = third - currentTime;
}

if(logEnable)
	logger.log("info", "after " + Math.floor(offset/3600) + "hours " + Math.floor((offset%3600)/60) + "mins " + Math.floor(offset%60) + "secs ");

/*
 * ==================================================
 *              Main weather service
 * ==================================================
 */
var zipMap = [];

var updateByMap = function(){
	var updateLimiter = limiter(weatherInfo.get).to(4).per(1000);	

	while(zipMap.length > 0) {
		updateLimiter(zipMap.shift(), function(err) {
			console.log(err);
		});
	}				
};

var updateInformation = function(initialize){
	waterfall([
		//First, get zip code map from database
		function(callback){
			couchbase.getZIP(function (error, data) {
				if(data != null) {
					data["rows"].forEach(function (val, idx) {
						zipMap.push(val["id"]);
					});
					callback(null);
				}
				else {
					callback(null, "done");
				}
			});
		},
		//Second, if first time to start then schedule next update timing
		function(callback){
			updateByMap();
			if(initialize) {
				setTimeout(function(){
					updateByMap();
					setInterval(function(){
						updateInformation(false);
					}, parseInt(env.UPDATE_INTERVAL));
				}, offset * 1000); //ms
			}
			callback(null, "done");
		}
	], function (err, res) {
		if(logEnable)
			logger.log("info", "weather information task is done");
	});
}
updateInformation(true);


