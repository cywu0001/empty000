var fs = require("fs");
var HashMap = require("hashmap").HashMap;
var dotEnv = require("dotenv");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);
var BlackCloudLogger = require("../../utils/BlackloudLogger");
var logger = BlackCloudLogger.new(env.PROJECT_NAME, "BillingPurchasingStat");

var setSuccess = {"status":{"code":1218,"message":"Set user status to purchasing success"}};
var queryResult = {"status":{"code":1217,"message":"Query is_purchasing success"},"is_purchasing":"0"};

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

    return setSuccess;
};

exports.get = function(key) {
    value = exports.lockMap.get(key);
    queryResult.is_purchasing = (value && value.status == "lock") ? "1":"0";
    return queryResult;
};

exports.cancel = function(key) {
    value = exports.lockMap.get(key);
    clearTimeout(value.timeout);
    exports.lockMap.remove(key);
};


