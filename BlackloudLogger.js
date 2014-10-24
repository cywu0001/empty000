
/* =================================================================
					Blackloud Logger API              
					---------------------				 v1.1.1
Feature:
	1. log data to local file under /log/debug.log.yyyy-MM-dd
	2. log exception events to local file under /log/exception.log.yyyy-MM-dd
	3. Daily file rotation
    4. S3 log update and auto update service
   +5. Modify the API function naming rule
   +6. Title specifying on logger constructor

Usage: 
	1. npm install
	2. require('./BlackCloudLogger') in your code

APIs:
	- BlackCloudLogger.New() 
		-> To new an instance of winston logger
	- BlackCloudLogger.Log(logger, type, data)
		-> Use the specific logger to log data on local file
		-> type field can be:
			- silly
			- debug
			- verbose
			- info
			- warn
			- error
   +- BlackCloudLogger.UpdateS3()
		-> Manually update debug.log & exceptions.log files to S3 storage

Sample:

==================
	Logger API
==================
var BlackloudLogger = require('./BlackloudLogger');
var logger = BlackloudLogger.new();
+or
+var logger = BlackloudLogger.new('SERVICE');
BlackloudLogger.log(logger, 'info', 'Hello there!');

and it will be logged in /log/debug.log.yyyy-MM-dd file.


==================
	S3 Update
==================
BlackCloudLogger.UpdateS3();

the debug.log.yyyy-MM-dd & exceptions.log.yyyy-MM-dd files will be updated to S3 storage.

================================================================= */

var fs = require('fs');
var winston = require('winston');
var caller = require('caller-id');
var log2s3 = require('./BlackloudLogUpdate');
var logSize = 1024 * 1024 * 1024;//10M

/*
 * --------------------------------------------------------
 * Setup server log directory (Create if not exist)
 * --------------------------------------------------------
 */
function checkDirExist(){
	if(!fs.existsSync('log')){
	  console.log("Log folder not exist, create it.\n");
	  fs.mkdirSync('log', 0775, function(err){
	    if(err){
	      console.log("Log folder create failure.\n");
	    }
	  });
	}
}

function getTimeStamp() {
	var date = new Date();
	var timeString = date.toLocaleTimeString();
	var timeStamp = timeString;
	//console.log('hello! -- timestamp function log -- ' + timeStamp);

	return timeStamp;
}

var BlackloudLogger = {
	// file id?  
	// upload to S3 server (need AWS api)
	new: function(title) {
		checkDirExist();
		var logger = new (winston.Logger)({
			transports: [
			    new (winston.transports.Console)({ 
					json: false, 
					label: title,
					timestamp: true, 
				}),
				/*
			    new winston.transports.File({ 
					filename: __dirname + '/log/debug.log', 
					json: false , 
					maxsize: logSize, 
					timestamp: function() {
						return true; 
					}
				}),
				*/
				new winston.transports.DailyRotateFile({
					name: 'file',
					filename: __dirname + '/log/debug.log',
					datePattern: '.yyyy-MM-dd',  
					label: title,
					//maxsize: logSize, 
					timestamp: function() { 
						return getTimeStamp();
					}
				})
			],
			exceptionHandlers: [
			    new (winston.transports.Console)({ 
					json: false, 
					label: title,
					timestamp: true 
				}),
				/*
			    new winston.transports.File({ 
					filename: __dirname + '/log/exceptions.log', 
					json: false, 
					maxsize: logSize
				})
				*/
				new winston.transports.DailyRotateFile({
					name: 'file',
					filename: __dirname + '/log/exceptions.log',
					datePattern: '.yyyy-MM-dd',
					label: title,
					//maxsize: logSize, 
					timestamp: function() { 
						return getTimeStamp();
					}
				})
			],
			exitOnError: false, 
		});
		return logger;
	},
	log: function(logger, type, data, metadata) {
		//var callerString = caller.getDetailedString();
		//logger.log(type, data, {caller: callerString});
		if( metadata == null )
			logger.log(type, data);
		else
			logger.log(type, data, metadata);
	},
	updateS3: function() {
		log2s3.update();		
	}
}

module.exports = BlackloudLogger;

