var fs = require("fs");
var time = require("time");
var request = require("request");
var dotEnv = require("dotenv");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);
var BlackloudLogger = require("../../utils/BlackloudLogger");
var logger = new BlackloudLogger(env.PROJECT_NAME, "blackloudTokenVerify");

exports.verify = function(token, pass, fail) {
    var current_time = Math.floor(new time.Date());
    var params = {
        token: token,
        api_key: "ICE-F2aOPC64Ke",
        api_token: "CiMrSnX4rvuujJjhqLNy",
        time: current_time
    }; 

    request({
        method: "POST",
        headers: {"content-type" : "application/json"},
        url:     "https://s5.securepilot.com/v1/token_verify",
        json:    true,
        body:    params
    }, function(error, response, body) {
       logger.log("info", "statusCode = " + response.statusCode);
       logger.log("info", "body = " + JSON.stringify(body));
       if (!error && response.statusCode == 200)
           pass();
       else
           fail();
    });
}

