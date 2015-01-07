
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

function checkFileExist(filename){
	//var fileName = getFileName(type);
	if(!fs.existsSync(filename)){
		console.log(filename + " not exist.");
		return false;
	}
	return true;
}

function getDirList() {
	var dirName = 'log/'
	var files = fs.readdirSync(dirName);
	var dirList = [];
	files.forEach(function(entry) {
		var path = dirName + entry;
		var stat = fs.statSync(path);
		if(stat.isDirectory())
			dirList.push(path);
	});
	console.log(dirList);
	return dirList;
}

function getFileList(dirList) {
	var fileList = [];
	var date = new Date();
	var dateString = date.yyyymmdd();
	var fileName = '';

	dirList.forEach(function(entry) {
		fileName = entry + '/debug.log.' + dateString;
		fileList.push(fileName);
		fileName = entry + '/exceptions.log.' + dateString;
		fileList.push(fileName);
	});
	console.log(fileList);
	return fileList;
}

function updateFileToS3() {
	var date = new Date();
	var dateString = date.yyyymmdd();
	var timeString = date.toLocaleTimeString();
	var fileName = '';
	var dirList = [];
	var fileList = [];

	console.log('S3 LOG update triggered at ' + dateString + ' ' + timeString);
	// Create new bucket first
	// ** need to check if the bucket is already exist?
	BlackloudAWSS3.createBucket(LOG_BUCKET_NAME);

	dirList = getDirList();
	fileList = getFileList(dirList);
	fileList.forEach(function(entry) {
		if(checkFileExist(entry))
		{
			console.log('got ' + entry + ' ... update to S3!');
			BlackloudAWSS3.putObj(LOG_BUCKET_NAME, entry);
		}	
	});
}

function getFileFromS3(filename, callback) {

	console.log('Download file %s from S3...', filename);
	var res = BlackloudAWSS3.getObj(LOG_BUCKET_NAME, filename, './', callback);
}

module.exports = {
	update : function() {
		updateFileToS3();
	}, 
	getDirectoryList: function() {
		return getDirList();
	},
	checkFile: function(filename){
		return checkFileExist(filename);
	}, 
	getFile: function(filename, callback) {
		getFileFromS3(filename, callback);
	}
}
