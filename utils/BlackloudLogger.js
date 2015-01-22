var	winston = require('winston'),
	winston_es = require('winston-elasticsearch');
var winstonNsSocket = require('winston-nssocket').Nssocket;

var fs = require("fs"),
	dotEnv = require("dotenv"),
	file = fs.readFileSync(__dirname + "/.env"),
	env = dotEnv.parse(file);

var logServerInfo = {
	ip : '54.68.219.109', 
}

function BlackloudLogger(project, title) {
	this.project = project;
    this.title = title ? title : null;

	if( env.LOGGER_ENABLE == 'on' )
	{
		this.logger = 
			new (winston.Logger)({
				// default transports were set to the remote log server
				transports: [
				    new (winston.transports.Console)({ 
						json: false, 
						label: this.title,
						timestamp: true, 
					}),
					new winston_es({ 
						level     : 'info',
						host      : logServerInfo.ip,
						indexName : 'blackloudlog',
						typeName  : this.project, 
						diable_fields : true
					})
				],
				exceptionHandlers: [
				    new (winston.transports.Console)({ 
						json: false, 
						label: this.title,
						timestamp: true 
					})
				],
				exitOnError: false, 
			});
	}
	else
	{
		this.logger = 
			new (winston.Logger)({
				// default transports were set to the remote log server
				transports: [
				    new (winston.transports.Console)({ 
						json: false, 
						label: this.title,
						timestamp: true, 
					}),
				],
				exceptionHandlers: [
				    new (winston.transports.Console)({ 
						json: false, 
						label: this.title,
						timestamp: true 
					})
				],
				exitOnError: false, 
			});
	}
}

BlackloudLogger.prototype = {
    log	    : log,
    setTitle: setTitle
};

function log(type, data) {
	this.logger.log(type, data, { label: this.title });
}

function setTitle(title) {
    this.title = title;
}

module.exports = BlackloudLogger;

