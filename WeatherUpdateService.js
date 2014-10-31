var time = require("time");
var waterfall = require("async-waterfall");
var couchbase = require("./couchbase");
var weatherInfo = require("./WeatherInformation");
var BlackCloudLogger = require("./BlackCloudLogger");
var logger = BlackCloudLogger.New("WeatherUpdateService");

/*
 * ==================================================
 *             Calculate next timing
 * ==================================================
 */
//Set by user
var timing = 2;  //0 ~ 11     
 
//Now time in west 
var current = new time.Date();
var currentTime = Math.floor(new time.Date()/1000);

//midnight in west
var midnight = new time.Date(current.getFullYear(), current.getMonth(), current.getDate());
var midnightTime = Math.floor(midnight/1000);

BlackCloudLogger.Log(logger, "info", "current time: " + current + " " + currentTime);
BlackCloudLogger.Log(logger, "info", "midnight time: " + midnight + " " + midnightTime);

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

BlackCloudLogger.Log(logger, "info", "after " + Math.floor(offset/3600) + "hours " + Math.floor((offset%3600)/60) 
				+ "mins " + Math.floor(offset%60) + "secs ");

/*
 * ==================================================
 *              Main weather service
 * ==================================================
 */
var zipCodeMap = [];
var reqInterval = 250; //ms
var updateInterval = 12 * 60 * 60 * 1000; //every 12 hours

var update = function(){
	weatherInfo.get(zipCodeMap.shift(), function(err) {
		BlackCloudLogger.Log(logger, "info", err);
	});

	if(zipCodeMap.length > 0) {
		setTimeout(update, reqInterval);			
	}
} 

var updateInformation = function(initialize){
	waterfall([
		//First, get zip code map from database
		function(callback){
			couchbase.getZIP(function (error, data) {
				if(data != null) {
					data["rows"].forEach(function (val, idx) {
						zipCodeMap.push(val["id"]);
					});
					callback(null);
				}
				else {
					callback(null, "done");
				}
			});
		},
		//Second, update weather information and need to schedule
		//the request cause server limitation.(5 requests/sec)
		function(callback){
			setTimeout(update, reqInterval);
			callback(null);
		},
		//Third, if first time to start then schedule next update timing
		function(callback){
			if(initialize) {
				setTimeout(function(){
					updateInformation(false);
					setInterval(function(){
						updateInformation(false);
					}, updateInterval);
				}, offset * 1000); //ms
			}
			callback(null, "done");
		}
	], function (err, res) {
		BlackCloudLogger.Log(logger, "info", "weather information task is done");
	});
}
updateInformation(true);

//For test
//weatherInfo.get(10001, function(err) {
//		BlackCloudLogger.Log(logger, "info", err);
//});



