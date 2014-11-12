var time = require("time");
var waterfall = require("async-waterfall");
var limiter = require("simple-rate-limiter");
var couchbase = require("./Couchbase");
var weatherInfo = require("./WeatherInformation");
var BlackCloudLogger = require("./BlackloudLogger");
var logger = BlackCloudLogger.new("WeatherUpdateService");

/*
 * ==================================================
 *             Calculate next timing
 * ==================================================
 */
//Set by user
var timing = 2;  //0 ~ 11
var updateInterval = 12 * 60 * 60 * 1000; //every 12 hours

//Now time in west 
var current = new time.Date();
var currentTime = Math.floor(new time.Date()/1000);

//midnight in west
var midnight = new time.Date(current.getFullYear(), current.getMonth(), current.getDate());
var midnightTime = Math.floor(midnight/1000);

BlackCloudLogger.log(logger, "info", "current time: " + current + " " + currentTime);
BlackCloudLogger.log(logger, "info", "midnight time: " + midnight + " " + midnightTime);

//ex.2:00 ___ 14:00 ___ 2:00
var first = midnightTime + (timing * 60 * 60);
var second = midnightTime + ((12 + timing) * 60 * 60);
var third = midnightTime + ((24 + timing) * 60 * 60);

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

BlackCloudLogger.log(logger, "info", "after " + Math.floor(offset/3600) + "hours " + Math.floor((offset%3600)/60) 
				+ "mins " + Math.floor(offset%60) + "secs ");

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
					}, updateInterval);
				}, offset * 1000); //ms
			}
			callback(null, "done");
		}
	], function (err, res) {
		BlackCloudLogger.log(logger, "info", "weather information task is done");
	});
}
updateInformation(true);


