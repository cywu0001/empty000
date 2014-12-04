var HashMap = require("hashmap").HashMap;
var dotEnv = require("dotenv");
var fs = require("fs");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);
var BlackCloudLogger = require("../../utils/BlackloudLogger");
var logger = BlackCloudLogger.new(env.PROJECT_NAME, "BillingPurchasingStat");

exports.lockMap = new HashMap();
exports.set = function(key) {
    timeout = setTimeout(function(){
        console.log(key + " remove");
		exports.lockMap.remove(key);
	}, 30 * 1000); //ms

    value = {
        status:"lock",
        timeout:timeout
    };
    exports.lockMap.set(key, value);
};

exports.get = function(key) {
    value = exports.lockMap.get(key);
    return (value.status == "lock");
};

exports.cancel = function(key) {
    value = exports.lockMap.get(key);
    clearTimeout(value.timeout);
    exports.lockMap.remove(key);
};


