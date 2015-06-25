var request = require("request");
var fs = require("fs");
var waterfall = require("async-waterfall");
var dotEnv = require("dotenv");
var weatherCodeMap = require("./WeatherCodeMapping");
var couchbase = require("./Couchbase");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);
var BlackloudLogger = require("../../utils/BlackloudLogger");
var logger = new BlackloudLogger(env.PROJECT_NAME, "WeatherInfomation");
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
	var url = "http://" + env.WEATHER_SERVER + env.SERVER_PATH + 
    	"/weather.ashx?q=" + zipCode + "&format=" + env.INFO_FORMAT + 
        "&num_of_days=" + env.FORECAST_DAYS + "&key=" + env.WEATHER_APIKEY;

   	if(zipCode.length != zipCodeLength) {
		callback(zipCodeError + " " + zipCode + " is not five digital", "done");
		return;
	}
     
	request(url, function(error, response, body) {
		if(logEnable) {
			logger.log("info", "request: " + url);
			logger.log("info", "body: " + body);
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
			console.log("get weather infornatiom fail....");
			if(body != undefined)
			{
				if(body.search(apiKeyErrorWWO) > 0) {
					callback(apiKeyError, "done");
				}
				else if(body.search(exceededPerSecErrorWWO) >= 0){
					if(logEnable)
						logger.log("info", exceededPerSecErrorWWO);
					weatherReq(zipCode, retry, callback);
				}	
				else if(body.search(exceededPerDayErrorWWO) >= 0){
					callback(exceededPerDayError, "done");
				}
			}
			//Try again after 1 second
			if(retry >= 1) {
				if(logEnable)
					logger.log("info", "Access server fail and try again");
				setTimeout(function(){
					weatherReq(zipCode, --retry, callback);
				}, 1000);
			}
			else {
				//Use backup service or not
				//callback("goto backup", "done");
				console.log("goto backup....done");
				callback("goto backup", "done");
				//callback(error,"done");
			}
		}
	}).on("error",function(error){
		console.log("request error=" + error);
		callback("goto backup", "done");
	});
}

exports.get = function(zipCode, result) {
	var currentObj;
	var forecastObj;
	
	waterfall([
		//First, get weather information form provider
		function(callback){
			weatherReq(zipCode, parseInt(env.RETRY_TIMES), callback);
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
							logger.log("info", "Insert current JSON completed");
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
				switch(env.SERVER_PATH) {
					case '/free/v1':
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
								suggestWatering: (parseFloat(val["precipMM"]) > 0) ? "0":"1"
							}
							forecastArray.push(obj);
						});
					break;

					case '/free/v2':
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
								suggestWatering: (parseFloat(val["hourly"][0]["precipMM"]) > 0) ? "0":"1"
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
				//Add by Will for Ca:900XX~961XX
				if((env.GOVERN_DEACTIVATE_WATERING=="true") && (parseFloat(zipCode) >= parseFloat("90000")) && (parseFloat(zipCode) <= parseFloat("96199")))
				{
					couchbase.getData(zipCode+"_forecast", function(err, data) {
						console.log("info++", JSON.stringify(forecastJson));
						if(err){
			        		console.log("info", "Can not get Ca zip code from DB");							
							if(forecastJson["data"]["weather"][0]["suggestWatering"]=="0")
							{
								forecastJson["data"]["weather"][0]["suggestWatering"]="2";
								forecastJson["data"]["weather"][1]["suggestWatering"]="2";
								forecastJson["data"]["weather"][2]["suggestWatering"]="2";
							}								
						}
						else
						{
		        			console.log("info", "Get Ca zip code");
				    		DB = JSON.parse(data);
							if(forecastJson["data"]["weather"][0]["suggestWatering"]=="0")
							{
								forecastJson["data"]["weather"][0]["suggestWatering"]="2";
								forecastJson["data"]["weather"][1]["suggestWatering"]="2";
								forecastJson["data"]["weather"][2]["suggestWatering"]="2";
							}else
							{
								if(forecastJson["data"]["weather"][0]["date"] == DB["data"]["weather"][0]["date"])
                            					{
		                        				console.log("info","get weather info at same day");
									if(forecastJson["data"]["weather"][0]["suggestWatering"]=="0")
						        		{
						                		forecastJson["data"]["weather"][0]["suggestWatering"]="2";
						                		forecastJson["data"]["weather"][1]["suggestWatering"]="2";
						                		forecastJson["data"]["weather"][2]["suggestWatering"]="2";
						        		}else
						        		{	 
		                         					forecastJson["data"]["weather"][0]["suggestWatering"]=DB["data"]["weather"][0]["suggestWatering"];
		                         					forecastJson["data"]["weather"][1]["suggestWatering"]=DB["data"]["weather"][1]["suggestWatering"];
		                         					forecastJson["data"]["weather"][2]["suggestWatering"]=DB["data"]["weather"][2]["suggestWatering"];
									}				
                            					}else
                            					{	
									console.log("info","get weather info at another day");
							 		if(forecastJson["data"]["weather"][0]["suggestWatering"]=="0")
					            			{
					                    			forecastJson["data"]["weather"][0]["suggestWatering"]="2";
					                    			forecastJson["data"]["weather"][1]["suggestWatering"]="2";
					                    			forecastJson["data"]["weather"][2]["suggestWatering"]="2";
					            			}else
					            			{	                                    
	                                    					if(DB["data"]["weather"][1]["suggestWatering"]=="2")
	                                            					forecastJson["data"]["weather"][0]["suggestWatering"]="2";
	                                    					if(DB["data"]["weather"][2]["suggestWatering"]=="2")
	                                            					forecastJson["data"]["weather"][1]["suggestWatering"]="2";
									}
                            					}
							}
						}
						couchbase.insertData(zipCode+"_forecast", forecastJson, function(err) {
							if(err == 0) {
								if(logEnable)
								{
									logger.log("info", "Insert Ca_forecast JSON completed");
									console.log("info---", JSON.stringify(forecastJson));
								}
								callback(null);
							}
							else {
								callback(databaseError, "done");
							}
						});
        			});
				//~
				}else
				{				
					couchbase.insertData(zipCode+"_forecast", forecastJson, function(err) {
						if(err == 0) {
							if(logEnable)
								logger.log("info", "Insert forecast JSON completed");
							callback(null);
						}
						else {
							callback(databaseError, "done");
						}
					});
				}
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
							logger.log("info", "Insert total JSON completed");
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
			console.log("goto backup....");
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
	var url = "http://" + env.WEATHER_SERVER_BACKUP + "/api/" + env.WEATHER_APIKEY_BACKUP 
              + "/" + feature + "/q/" + zipCode + "." + env.INFO_FORMAT;

	request(url, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			if(logEnable) {
				logger.log("info", "request: " + url);
				//logger.log("info", "body: " + body);
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
				logger.log("error", "request error: " + url);
			callback(serverError, "done");
		}
	}).on("error",function(error){
                console.log("request backup error=" + error);
        });    
}

exports.getBackup = function(zipCode, result) {
	var currentObj;
	var forecastObj;
	console.log("Into getBackup()....");
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
							logger.log("info", "Insert current JSON completed");
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
							logger.log("info", "Too much forecast information");
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
						suggestWatering: (parseFloat(val["qpf_allday"]["mm"]) > 0) ? "0":"1"
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
							logger.log("info", "Insert forcast JSON completed");
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
					logger.log("info", JSON.stringify(totalObj));
				couchbase.insertData(zipCode + "", totalJson, function(err) {
					if(err == 0) {
						if(logEnable)
							logger.log("info", "Insert total JSON completed");
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

