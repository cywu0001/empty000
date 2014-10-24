
var fs = require('fs');
var BlackloudAWSS3 = require('./BlackloudAWSS3');
var LOG_BUCKET_NAME = 'BlackloudLog';

// For generating customed timestamp info.
Date.prototype.yyyymmdd = function() {
	var yyyy = this.getFullYear().toString();                                    
    var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based         
    var dd  = this.getDate().toString();             
                            
    return yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0]);
}

function checkFileExist(type){
	var fileName = getFileName(type);
	if(!fs.existsSync(fileName)){
		console.log(fileName + " not exist, abort.");
		return false;
	}
	return true;
}

function getFileName(type) {
	var fileName = '';
	var date = new Date();
	switch(type){
		case 'debug':
			fileName = 'log/debug.log.' + date.yyyymmdd();
			break;
		case 'exceptions':
			fileName = 'log/exceptions.log.' + date.yyyymmdd();
			break;
	}
	return fileName;
}

function updateFileToS3() {
	var date = new Date();
	var dateString = date.yyyymmdd();
	var timeString = date.toLocaleTimeString();

	console.log('S3 LOG update triggered at ' + dateString + ' ' + timeString);
	// Create new bucket first
	// ** need to check if the bucket is already exist?
	BlackloudAWSS3.createBucket(LOG_BUCKET_NAME);
	//setTimeout(function () { console.log('Done waiting for making a bucket!') }, 2000);
	// Update debug.log file
	if(checkFileExist('debug'))
		BlackloudAWSS3.putObj(LOG_BUCKET_NAME, getFileName('debug'));
	// Update exception.log file
	if(checkFileExist('exceptions'))
		BlackloudAWSS3.putObj(LOG_BUCKET_NAME, getFileName('exceptions'));
}

module.exports = {
	update : function() {
		updateFileToS3();
	}
}
