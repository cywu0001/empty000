var http = require("http");
var request = require("request");
var fs = require("fs");
var waterfall = require("async-waterfall");
var couchbase = require("./couchbase");
var BlackCloudLogger = require("./BlackCloudLogger");
var logger = BlackCloudLogger.New("WeatherInformation");

//Server settings
var weatherServer = "api.worldweatheronline.com";
var serverPath = "/free/v1/weather.ashx?";
var format = "json";
var days = "3";
var apiKey = "19eb3c74221695b82ca12d3f90b4c4f116742277";
var retryTimes = 1;

//Backup server settings
var weatherServerBackup = "api.wunderground.com";
var apiKeyBackup = "b8c3a8184aca6862";
var formatBackup = "json";

//Error response from weather provider
var apiKeyErrorWWO = "is not a valid key";
var zipCodeErrorWWO = "Unable to find any matching weather location";
var apiKeyErrorWUG = "this key does not exist";
var zipCodeErrorWUG = "No cities match your search query";

//Error response for HTTP service
var updateCompleted = "completed";
var apiKeyError = "invalid api key";
var zipCodeError = "invalid zip code";
var databaseError = "database error";
var parseError = "parse error";
var serverError = "server error";

/*
 * ================================================================
 *         Get weather info by zip code (worldweatheronline)
 * ================================================================
 */

function weatherReq(zipCode, retry, callback) {
	var url = "http://" + weatherServer + serverPath + "q=" + zipCode + "&format=" + format 
			   + "&num_of_days=" + days + "&key=" + apiKey;
          
	request(url, function(error, response, body) {
		BlackCloudLogger.Log(logger, "info", "request: " + url);
		BlackCloudLogger.Log(logger, "info", "body: " + body);

		if (!error && response.statusCode == 200) {
			var weatherInfo = JSON.parse(body);

			//Get Error response from weather provider
			if(weatherInfo["data"]["error"] != null) {
				if(body.search(apiKeyErrorWWO) > 0) {
					callback(apiKeyError, "done");
				}
				else if(body.search(zipCodeErrorWWO) > 0) {
					callback(zipCodeError, "done");
				}
				else {
					callback(weatherInfo["data"]["error"][0]["msg"], "done");
				}
			}
			else {
				callback(null, weatherInfo);
			}
		}
		else {
			BlackCloudLogger.Log(logger, "error", "request error: " + url);
			if(body.search(apiKeyErrorWWO) > 0) {
				callback(apiKeyError, "done");
			}
			//Try again after 1 second
			else if(retry >= 1) {
				setTimeout(function(){
					weatherReq(zipCode, --retry, callback);
				}, 1000);
			}
			else {
				//Use backup weather provider
				callback("goto backup", "done");
			}   
		}
	});
}

exports.get = function(zipCode, result) {
	waterfall([
		//First, get weather information form provider
		function(callback){
			weatherReq(zipCode, retryTimes, callback);
		},
		//Second, parse current information and insert to database
		function(weatherInfo, callback){
			try {
				var currentObj = {
					data: {
						current_condition: [
							{
								precipMM: weatherInfo["data"]["current_condition"][0]["precipMM"],
								temp_C: weatherInfo["data"]["current_condition"][0]["temp_C"],
								weatherCode: weatherInfo["data"]["current_condition"][0]["weatherCode"],
								weatherDesc: weatherInfo["data"]["current_condition"][0]["weatherDesc"]
							}
						]
					}
				};

				var currentJson = JSON.parse(JSON.stringify(currentObj));
				couchbase.insertData(zipCode+"_current", currentJson, function(err) {
					if(err == 0) {
						BlackCloudLogger.Log(logger, "info", "Insert current JSON completed");
						callback(null, weatherInfo);
					}
					else {
						callback(databaseError, "done");
					}
				});
			} catch(err) {
				callback(parseError, "done");
			}
		},
		//Third, parse forcast information and insert to database
		function(weatherInfo, callback){
			try {
				var forecastArray = [];
				weatherInfo["data"]["weather"].forEach(function (val, idx) {
					var obj = {
						date: val["date"],
						precipMM: val["precipMM"],
						tempMaxC: val["tempMaxC"],
						tempMaxF: val["tempMaxF"],
						tempMinC: val["tempMinC"],
						tempMinF: val["tempMinF"],
						weatherCode: val["weatherCode"],
						weatherDesc: val["weatherDesc"],
						winddir16Point: val["winddir16Point"],
						winddirDegree: val["winddirDegree"],
						winddirection: val["winddirection"],
						windspeedKmph: val["windspeedKmph"],
						windspeedMiles: val["windspeedMiles"],
						watering: (val["precipMM"] > 0) ? "1":"0"
					}
					forecastArray.push(obj);
				});
				
				var forecastObj = {
					data: {
						weather: forecastArray
					}
				};

				var forecastJson = JSON.parse(JSON.stringify(forecastObj));
				couchbase.insertData(zipCode+"_forcast", forecastJson, function(err) {
					if(err == 0) {
						BlackCloudLogger.Log(logger, "info", "Insert forecast JSON completed");
						callback(null, weatherInfo, forecastArray);
					}
					else {
						callback(databaseError, "done");
					}
				});
			} catch(err) {
				callback(parseError, "done");
			}
		},
		//Forth, combine forcast and current and insert to database
		function(weatherInfo, forecastInfo, callback){
			try {
				var totalObj = {
					data: {
						current_condition: weatherInfo["data"]["current_condition"][0],
						weather: forecastInfo
					}   
				};

				var totalJson = JSON.parse(JSON.stringify(totalObj));
				BlackCloudLogger.Log(logger, "info", JSON.stringify(totalObj));
				couchbase.insertData(zipCode + "", totalJson, function(err) {
					if(err == 0) {
						BlackCloudLogger.Log(logger, "info", "Insert total JSON completed");
						callback(updateCompleted, "done");
					}
					else {
						callback(databaseError, "done");
					}                
				});
			} catch(err) {
				callback(parseError, "done");
			}
		}
	], function (err, res) {
		// Result now equals 'done'
		if(err == "goto backup") {
			exports.getBackup(zipCode, result);		
		} else {
			result(err);
		}   
	});
}

/*
 * ================================================================
 *          Get weather info by zip code (wunderground)
 * ================================================================
 */

function weatherBackupReq(zipCode, feature, callback) {
	var url = "http://" + weatherServerBackup + "/api/" + apiKeyBackup + "/" + feature 
			   + "/q/" + zipCode + "." + formatBackup;

	request(url, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			BlackCloudLogger.Log(logger, "info", "request: " + url);
			//BlackCloudLogger.Log(logger, "info", "body: " + body);
			var weatherInfo = JSON.parse(body);

			//Get Error MSG
			if(weatherInfo["response"]["error"] != null) {
				if(body.search(apiKeyErrorWUG) > 0) {
					callback(apiKeyError, "done");
				}
				else if(body.search(zipCodeErrorWUG) > 0) {
					callback(zipCodeError, "done");
				}
				else {
					callback(weatherInfo["response"]["error"], "done");
				}
			}
			else {
				callback(null, weatherInfo);	  
			}		
		}
		else {
			BlackCloudLogger.Log(logger, "error", "request error: " + url);
			callback(serverError, "done");
		}
	});    
}

exports.getBackup = function(zipCode, result) {
	var currentObj;
	var forecastObj;

	waterfall([
		//First, get weather current information form provider
		function(callback){
			weatherBackupReq(zipCode,"conditions", callback);
		},
		//Second, parse current information and insert to database
		function(weatherInfo, callback){
			try {
				currentObj = {
					data: {
						current_condition: [
							{
								precipMM: weatherInfo["current_observation"]["precip_1hr_metric"],
								temp_C: weatherInfo["current_observation"]["temp_c"],
								weatherCode: weatherInfo["current_observation"]["weather"],  //Need to mapping
								weatherDesc: weatherInfo["current_observation"]["weather"]   //Need to mapping
							}
						]
					}
				};

				var currentJson = JSON.parse(JSON.stringify(currentObj));
				couchbase.insertData(zipCode+"_current", currentJson, function(err) {
					if(err == 0) {
						BlackCloudLogger.Log(logger, "info", "Insert current JSON completed");
						callback(null);
					}
					else {
						callback(databaseError, "done");
					}                
				});
			} catch(err) {
				callback(parseError, "done");
			}
		},
		//Third, get weather forecast information form provider
		function(callback){
			weatherBackupReq(zipCode,"forecast", callback);
		},
		//Forth, parse forecast information and insert to database
		function(weatherInfo, callback){
			try {
				var forecastArray = [];
				weatherInfo["forecast"]["simpleforecast"]["forecastday"].forEach(function (val, idx) {
					if(idx > 2){
						BlackCloudLogger.Log(logger, "info", "Too much forecast information");
						return;
					}
					var obj = {
						date: val["date"]["year"] + "-" + val["date"]["month"] + "-" + val["date"]["day"],
						precipMM: val["qpf_allday"]["mm"],
						tempMaxC: val["high"]["celsius"],
						tempMaxF: val["high"]["fahrenheit"],
						tempMinC: val["low"]["celsius"],
						tempMinF: val["low"]["fahrenheit"],
						weatherCode: val["conditions"], //Need to mapping
						weatherDesc: val["conditions"], //Need to mapping
						winddir16Point: val["avewind"]["dir"],
						winddirDegree: val["avewind"]["degrees"],
						winddirection: val["avewind"]["dir"],
						windspeedKmph: val["avewind"]["kph"],
						windspeedMiles: val["avewind"]["mkh"],
						watering: (val["qpf_allday"]["mm"] > 0) ? "1":"0"
					}
					forecastArray.push(obj);
				});
				
				forecastObj = {
					data: {
						weather: forecastArray
					}
				};

				var forecastJson = JSON.parse(JSON.stringify(forecastObj));
				couchbase.insertData(zipCode+"_forecast", forecastJson, function(err) {
					if(err == 0) {
						BlackCloudLogger.Log(logger, "info", "Insert forcast JSON completed");
						callback(null);
					}
					else {
						callback(databaseError, "done");
					}                     
				});
			} catch(err) {
				callback(parseError, "done");   
			}
		},
		//Fifth, combine forcast and current and insert to database
		function(callback){ 
			try {
				var totalObj = {
					data: {
						current_condition: currentObj["data"],
						weather: forecastObj["data"]
					}   
				};

				var totalJson = JSON.parse(JSON.stringify(totalObj));
				BlackCloudLogger.Log(logger, "info", JSON.stringify(totalObj));
				couchbase.insertData(zipCode + "", totalJson, function(err) {
					if(err == 0) {
						BlackCloudLogger.Log(logger, "info", "Insert total JSON completed");
						callback(updateCompleted, "done");   
					}
					else {
						callback(databaseError, "done");
					}           
				});
			} catch(err) {
				callback(parseError, "done");
			}
		}
	], function (err, res) {
		//Result now equals 'done'
		result(err);
   });
};

