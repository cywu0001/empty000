var fs = require('fs');
var dotenv = require('dotenv');
var winston = require('winston');
var winstonNsSocket = require('winston-nssocket').Nssocket;
//var log2s3 = require('./BlackloudLog2S3');
var logSize = 1024 * 1024 * 1024;//10M
/*
 * --------------------------------------------------------
 * Setup server log directory (Create if not exist)
 * --------------------------------------------------------
 */
function checkDirExist(pid){
	if(!fs.existsSync('log')){
	  console.log("Log folder not exist, create it.\n");
	  fs.mkdirSync('log', 0775, function(err){
	    if(err){
	      console.log("Log folder create failure.\n");
	    }
	  });
	}
	else if(!fs.existsSync('log/' + pid)){
	  console.log(pid + " folder not exist, create it.\n");
	  fs.mkdirSync('log/' + pid, 0775, function(err){
	    if(err){
	      console.log(pid +" folder create failure.\n");
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

var logServerIP = '54.68.219.109';
var portMap = ({
	'WEATHER': 8081,
	'BILLING': 8082,
});
var BlackloudLogger = {
	new: function(project, title) {
		// create a folder for PROJECT_NAME, 
		// to store the local exception files.
		//checkDirExist(projectName);

		var logger = new (winston.Logger)({
			// default transports were set to the remote log server
			transports: [
			    new (winston.transports.Console)({ 
					json: false, 
					label: title,
					timestamp: true, 
				}),
			],
			exceptionHandlers: [
			    new (winston.transports.Console)({ 
					json: false, 
					label: title,
					timestamp: true 
				}),
/*
				new winston.transports.DailyRotateFile({
					name: 'file',
					filename: __dirname + '/log/' + projectName + '/exceptions.log',
					datePattern: '.yyyy-MM-dd',
					label: title,
					timestamp: function() { 
						return getTimeStamp();
					}
				})
*/
			],
			exitOnError: false, 
		});
		//console.log(map[project]);
		logger.add(winstonNsSocket, {
			host: logServerIP,
			port: portMap[project]
		});
		return logger;
	},
	log: function(logger, type, data, metadata) {
		if( metadata == null )
			logger.log(type, data);
		else
			logger.log(type, data, metadata);
	},
}

module.exports = BlackloudLogger;

