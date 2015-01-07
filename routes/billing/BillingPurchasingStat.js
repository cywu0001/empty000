var fs = require("fs");
var HashMap = require("hashmap").HashMap;
var dotEnv = require("dotenv");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);
var BlackloudLogger = require("../../utils/BlackloudLogger");
var logger = new BlackloudLogger(env.PROJECT_NAME, "BillingPurchasingStat");

var setPurchaseSuccess = {"status":{"code":1218,"message":"Set user status to purchasing success"}};
var setPurchaseFail = {"status":{"code":1413,"message":"Fail to set purchasing"}};
var queryResult = {"status":{"code":1217,"message":"Query is_purchasing success"},"is_purchasing":"0"};

exports.lockMap = new HashMap();
exports.set = function(params, res) {
    try {  
        if(exports.lockMap.get(params.device_ID) == null) {
            timeout = setTimeout(function(){
                logger.log("info", params.device_ID + " is removed");
		        exports.lockMap.remove(params.device_ID);
	        }, 30 * 1000); //ms

            value = {
                status:"lock",
                timeout:timeout
            };

            exports.lockMap.set(params.device_ID, value);
            res.statusCode = 200;
            res.send(setPurchaseSuccess);
        }
        else {
            res.statusCode = 400;
            res.send(setPurchaseFail);
        }
    } catch(err) {
        res.statusCode = 400;
        res.send(setPurchaseFail);
    }
};

exports.get = function(params, res) {
    value = exports.lockMap.get(params.device_ID);
    queryResult.is_purchasing = (value && value.status == "lock") ? "1":"0";
   
    res.statusCode = 200;
    res.send(queryResult);
};

exports.cancel = function(key) {
    value = exports.lockMap.get(key);
    if(value != null){
        clearTimeout(value.timeout);
        exports.lockMap.remove(key);
    }
};


