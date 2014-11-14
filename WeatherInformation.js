var http = require("http");
var request = require("request");
var fs = require("fs");
var waterfall = require("async-waterfall");
var couchbase = require("./Couchbase");
var dotEnv = require("dotenv");
var weatherCodeMap = require("./WeatherCodeMapping");
var BlackCloudLogger = require("./BlackloudLogger");
var logger = BlackCloudLogger.new("WeatherInformation");

dotEnv.load();
var logEnable = true;
var zipCodeLength = 5;

//Error response from worldweatheronline
var apiKeyErrorWWO = "is not a valid key";
var zipCodeErrorWWO = "Unable to find any matching weather location";
var exceededPerSecErrorWWO = "Queries per second exceeded";
var exceededPerDayErrorWWO = "Queries per day exceeded";

//Error response from wunderground
var apiKeyErrorWUG = "this key does not exist";
var zipCodeErrorWUG = "No cities match your search query";

//Error response for HTTP service
var updateCompleted = "completed";
var apiKeyError = "invalid api key";
var zipCodeError = "invalid zip code";
var databaseError = "database error";
var parseError = "parse error";
var serverError = "server error";
var exceededPerSecError = "exceeded per sec error";
var exceededPerDayError = "exceeded per day error";

/*
 * ================================================================
 *         Get weather info by zip code (worldweatheronline)
 * ================================================================
 */

function weatherReq(zipCode, retry, callback) {
	var url = "http://" + process.env.WEATHER_SERVER + process.env.SERVER_VER + 
    	"/weather.ashx?q=" + zipCode + "&format=" + process.env.INFO_FORMAT + 
        "&num_of_days=" + process.env.FORECAST_DAYS + "&key=" + process.env.WEATHER_APIKEY;

   	if(zipCode.length != zipCodeLength) {
		callback(zipCodeError + " " + zipCode + " is not five digital", "done");
		return;
	}
     
	request(url, function(error, response, body) {
		if(logEnable) {
			BlackCloudLogger.log(logger, "info", "request: " + url);
			BlackCloudLogger.log(logger, "info", "body: " + body);
		}

		if (!error && response.statusCode == 200) {
			var weatherInfo = JSON.parse(body);

			//Get Error response from weather provider
			if(weatherInfo["data"]["error"] != null) {
				if(body.search(apiKeyErrorWWO) > 0) {
					callback(apiKeyError, "done");
				}
				else if(body.search(zipCodeErrorWWO) > 0) {
					callback(zipCodeError + " " + zipCode, "done");
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
			if(body.search(apiKeyErrorWWO) > 0) {
				callback(apiKeyError, "done");
			}
			else if(body.search(exceededPerSecErrorWWO) >= 0){
				if(logEnable)
					BlackCloudLogger.log(logger, "info", exceededPerSecErrorWWO);
				weatherReq(zipCode, retry, callback);
			}
			else if(body.search(exceededPerDayErrorWWO) >= 0){
				callback(exceededPerDayError, "done");
			}
			//Try again after 1 second
			else if(retry >= 1) {
				if(logEnable)
					BlackCloudLogger.log(logger, "info", "Access server fail and try again");
				setTimeout(function(){
					weatherReq(zipCode, --retry, callback);
				}, 1000);
			}
			else {
				//Use backup service or not
				//callback("goto backup", "done");
				callback(error, "done");
			}   
		}
	});
}

exports.get = function(zipCode, result) {
	var currentObj;
	var forecastObj;
	
	waterfall([
		//First, get weather information form provider
		function(callback){
			weatherReq(zipCode, parseInt(process.env.RETRY_TIMES), callback);
		},
		//Second, parse current information and insert to database
		function(weatherInfo, callback){
			try {
				currentObj = {
					data: {
						current_condition: [
							{
								precipMM: weatherInfo["data"]["current_condition"][0]["precipMM"],
								temp_C: weatherInfo["data"]["current_condition"][0]["temp_C"],
								weatherCode: weatherInfo["data"]["current_condition"][0]["weatherCode"],
								weatherDesc: weatherInfo["data"]["current_condition"][0]["weatherDesc"][0]["value"]
							}
						]
					}
				};

				var currentJson = JSON.parse(JSON.stringify(currentObj));
				couchbase.insertData(zipCode+"_current", currentJson, function(err) {
					if(err == 0) {
						if(logEnable)
							BlackCloudLogger.log(logger, "info", "Insert current JSON completed");
						callback(null, weatherInfo);
					}
					else {
						callback(databaseError, "done");
					}
				});

			} catch(err) {
				callback(parseError + " in current", "done");
			}
		},
		//Third, parse forcast information and insert to database
		function(weatherInfo, callback){
			try {
				var forecastArray = [];
				switch(process.env.SERVER_VER) {
					case 'v1':
						weatherInfo["data"]["weather"].forEach(function (val, idx) {
							var obj = {
								date: val["date"],
								precipMM: val["precipMM"],
								tempMaxC: val["tempMaxC"],
								tempMaxF: val["tempMaxF"],
								tempMinC: val["tempMinC"],
								tempMinF: val["tempMinF"],
								weatherCode: val["weatherCode"],
								weatherDesc: val["weatherDesc"][0]["value"],
								winddir16Point: val["winddir16Point"],
								winddirDegree: val["winddirDegree"],
								winddirection: val["winddirection"],
								windspeedKmph: val["windspeedKmph"],
								windspeedMiles: val["windspeedMiles"],
								suggestWatering: (val["precipMM"] > 0) ? "1":"0"
							}
							forecastArray.push(obj);
						});
					break;

					case 'v2':
						weatherInfo["data"]["weather"].forEach(function (val, idx) {
							var obj = {
								date: val["date"],
								precipMM: val["hourly"][0]["precipMM"],
								tempMaxC: val["hourly"][0]["tempMaxC"],
								tempMaxF: val["hourly"][0]["tempMaxF"],
								tempMinC: val["hourly"][0]["tempMinC"],
								tempMinF: val["hourly"][0]["tempMinF"],
								weatherCode: val["hourly"][0]["weatherCode"],
								weatherDesc: val["hourly"][0]["weatherDesc"][0]["value"],
								winddir16Point: val["hourly"][0]["winddir16Point"],
								winddirDegree: val["hourly"][0]["winddirDegree"],
								winddirection: val["hourly"][0]["winddirection"],
								windspeedKmph: val["hourly"][0]["windspeedKmph"],
								windspeedMiles: val["hourly"][0]["windspeedMiles"],
								suggestWatering: (val["hourly"][0]["precipMM"] > 0) ? "1":"0"
							}
							forecastArray.push(obj);
						});
					break;
				}
				
				forecastObj = {
					data: {
						weather: forecastArray
					}
				};

				var forecastJson = JSON.parse(JSON.stringify(forecastObj));
				couchbase.insertData(zipCode+"_forecast", forecastJson, function(err) {
					if(err == 0) {
						if(logEnable)
							BlackCloudLogger.log(logger, "info", "Insert forecast JSON completed");
						callback(null);
					}
					else {
						callback(databaseError, "done");
					}
				});
			} catch(err) {
				callback(parseError + " in forcast", "done");
			}
		},
		//Forth, combine forecast and current and insert to database
		function(callback){
			try {
				var totalObj = {
					data: {
						current_condition: currentObj["data"]["current_condition"],
						weather: forecastObj["data"]["weather"]
					}   
				};

				var totalJson = JSON.parse(JSON.stringify(totalObj));
				couchbase.insertData(zipCode + "", totalJson, function(err) {
					if(err == 0) {
						if(logEnable)
							BlackCloudLogger.log(logger, "info", "Insert total JSON completed");
						callback(updateCompleted, "done");
					}
					else {
						callback(databaseError, "done");
					}                
				});
			} catch(err) {
				callback(parseError + " in total", "done");
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
	var url = "http://" + process.env.WEATHER_SERVER_BACKUP + "/api/" + process.env.WEATHER_APIKEY_BACKUP 
              + "/" + feature + "/q/" + zipCode + "." + process.env.INFO_FORMAT;

	request(url, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			if(logEnable) {
				BlackCloudLogger.log(logger, "info", "request: " + url);
				//BlackCloudLogger.log(logger, "info", "body: " + body);
			}
			var weatherInfo = JSON.parse(body);

			//Get Error MSG
			if(weatherInfo["response"]["error"] != null) {
				if(body.search(apiKeyErrorWUG) > 0) {
					callback(apiKeyError, "done");
				}
				else if(body.search(zipCodeErrorWUG) > 0) {
					callback(zipCodeError + " " + zipCode, "done");
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
			if(logEnable)
				BlackCloudLogger.log(logger, "error", "request error: " + url);
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
								weatherCode: weatherCodeMap.getWeatherCode(
												weatherInfo["current_observation"]["icon"]),
								weatherDesc: weatherCodeMap.getWeatherDesc(
												weatherInfo["current_observation"]["icon"])
							}
						]
					}
				};

				var currentJson = JSON.parse(JSON.stringify(currentObj));
				couchbase.insertData(zipCode+"_current", currentJson, function(err) {
					if(err == 0) {
						if(logEnable)
							BlackCloudLogger.log(logger, "info", "Insert current JSON completed");
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
						if(logEnable)
							BlackCloudLogger.log(logger, "info", "Too much forecast information");
						return;
					}

					var obj = {
						date: val["date"]["year"] + "-" + val["date"]["month"] + "-" + val["date"]["day"],
						precipMM: val["qpf_allday"]["mm"],
						tempMaxC: val["high"]["celsius"],
						tempMaxF: val["high"]["fahrenheit"],
						tempMinC: val["low"]["celsius"],
						tempMinF: val["low"]["fahrenheit"],
						weatherCode: weatherCodeMap.getWeatherCode(val["icon"]),
						weatherDesc: weatherCodeMap.getWeatherDesc(val["icon"]),
						winddir16Point: val["avewind"]["dir"],
						winddirDegree: val["avewind"]["degrees"],
						winddirection: val["avewind"]["dir"],
						windspeedKmph: val["avewind"]["kph"],
						windspeedMiles: val["avewind"]["mkh"],
						suggestWatering: (val["qpf_allday"]["mm"] > 0) ? "1":"0"
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
						if(logEnable)
							BlackCloudLogger.log(logger, "info", "Insert forcast JSON completed");
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
				if(logEnable)
					BlackCloudLogger.log(logger, "info", JSON.stringify(totalObj));
				couchbase.insertData(zipCode + "", totalJson, function(err) {
					if(err == 0) {
						if(logEnable)
							BlackCloudLogger.log(logger, "info", "Insert total JSON completed");
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

