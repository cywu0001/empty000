var HashMap = require("hashmap").HashMap;
var codeMap = new HashMap();

//Wunderground icon_name -> Worldweatheronline {code,desc}
codeMap.set("chanceflurries", {code: "368", desc: "Light snow showers"});	
codeMap.set("chancerain", {code: "299", desc: "Moderate rain at times"});	
codeMap.set("chancesleet", {code: "311", desc: "Light freezing rain"});		
codeMap.set("chancesnow", {code: "326", desc: "Light snow"});
codeMap.set("chancetstorms", {code: "386", desc: "Patchy light rain in area with thunder"});	
codeMap.set("clear", {code: "113", desc: "Clear/Sunny"});	
codeMap.set("cloudy", {code: "119", desc: "Cloudy"});	
codeMap.set("flurries", {code: "371", desc: "Moderate or heavy snow showers"});	
codeMap.set("fog", {code: "248", desc: "Fog"});	
codeMap.set("hazy", {code: "122", desc: "Overcast"});	
codeMap.set("mostlycloudy", {code: "119", desc: "Cloudy"});	
codeMap.set("mostlysunny", {code: "113", desc: "Clear/Sunny"});	
codeMap.set("partlycloudy", {code: "116", desc: "Partly Cloudy"});	
codeMap.set("partlysunny", {code: "113", desc: "Clear/Sunny"});	
codeMap.set("sleet", {code: "314", desc: "Moderate or Heavy freezing rain"});	
codeMap.set("rain", {code: "308", desc: "Heavy rain"});	
codeMap.set("snow", {code: "338", desc: "Heavy snow"});	
codeMap.set("sunny", {code: "113", desc: "Clear/Sunny"});	
codeMap.set("tstorms", {code: "389", desc: "Moderate or heavy rain in area with thunder"});	
codeMap.set("unknown", {code: "113", desc: "Clear/Sunny"});

exports.getWeatherCode = function(iconName) {
	return codeMap.get(iconName)["code"];
}

exports.getWeatherDesc = function(iconName) {
	return codeMap.get(iconName)["desc"];
}


	

