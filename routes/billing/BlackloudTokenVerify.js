var fs = require("fs");
var time = require("time");
var request = require("request");
var dotEnv = require("dotenv");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);
var BlackCloudLogger = require("../../utils/BlackloudLogger");
var logger = BlackCloudLogger.new(env.PROJECT_NAME, "blackloudTokenVerify");

exports.verify = function(token, pass, fail) {
    var params = {
        token: token,
        api_key: "ICE-F2aOPC64Ke",
        api_token: "CiMrSnX4rvuujJjhqLNy",
        time: Math.floor(new time.Date())
    }; 

    request({
        method: "POST",
        headers: {"content-type" : "application/x-www-form-urlencoded"},
        url:     "https://s5.securepilot.com/v1/token_verify",
        body:    JSON.stringify(params)
    }, function(error, response, body) {
       BlackCloudLogger.log(logger, "info", "response.statusCode = " + response.statusCode);
       BlackCloudLogger.log(logger, "info", "response.statusCode = " + response.body);
       if (!error && response.statusCode == 200)
           pass();
       else
           fail();
    });
}

