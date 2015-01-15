var	winston = require('winston'),
	winston_es = require('winston-elasticsearch');
var winstonNsSocket = require('winston-nssocket').Nssocket;

var logServerInfo = {
	//ip : '54.68.219.109', 
	ip : '10.70.1.213', 
	port : {
		'WEATHER' : 8081,
		'BILLING' : 8082,
		'NONE3'   : 8083,
		'NONE4'   : 8084,
		'NONE5'   : 8085,
		'NONE6'   : 8086,
		'NONE7'   : 8087,
		'NONE8'   : 8088,
		'NONE9'   : 8089,
		'NONE10'  : 8090
	}
}

function BlackloudLogger(project, title) {
	this.project = project;
    this.title = title ? title : null;
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
					indexName : 'BlackloudLogger',
					typeName  : this.project, 
					diable_fields : true
				})
			],
			exceptionHandlers: [
			    new (winston.transports.Console)({ 
					json: false, 
					label: this.title,
					timestamp: true 
				}),
			],
			exitOnError: false, 
		});
		/*
	this.logger.add(winstonNsSocket, {
		host: logServerInfo.ip,
		port: logServerInfo.port[project]
	});
	*/
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

