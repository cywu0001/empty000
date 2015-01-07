
var log2s3 = require('./BlackloudLog2S3'); 
var fs = require('fs');
var UPDATE_INTERVAL = 1000 * 60 * 60 * 12; // 12hr -> ms
//var UPDATE_INTERVAL = 1000 * 5; // 12hr -> ms

dailyRoutine();
// Auto update every 12 hr
var tick = setInterval(dailyRoutine, UPDATE_INTERVAL);

function dailyRoutine() {
	// Do once when first calling this service.
	// or it should wait for a long time to get launched.
	console.log('Update at service start!');
	var dirList = log2s3.getDirectoryList();
	var fileList = getFileList(dirList);
	removeFiles(dirList, fileList);
	log2s3.update();
}

/**
 *		Get date list 
 *		starting from the triggered date to the past 7 days
**/
function getFileList(dirList) {

	var now = new Date();
	var fileList = [];
	
	dirList.forEach(function(entry) {
		// keep the past 7 days and current day files
		for(var i=0 ; i<=7 ; i++)
		{
			var past = new Date(now.getTime() - 1000*60*60*24*i);
			var dateString = past.yyyymmdd();
			//console.log(dateString);
			fileList.push(entry + '/debug.log.' + dateString);
			fileList.push(entry + '/exceptions.log.' + dateString);
		}
	});
		
	console.log(fileList);
	return fileList;
}

/**
 *		Remove redundant files 
 *		remove the files which are not specified in fileList
**/

function removeFiles(dirList, fileList) {

	dirList.forEach(function(outer) {

		var currentList = fs.readdirSync(outer);
		currentList.forEach(function(inner) {
			var file = outer + '/' + inner;
			//console.log(file);
			if(fileList.indexOf(file) > -1)
				console.log(file + ' ... keep it!');
			else
			{
				console.log(file + ' not in list ... remove it!');
				fs.unlink(file);
			}
		});	
	});
}

// For generating customed timestamp info.
Date.prototype.yyyymmdd = function() {
	var yyyy = this.getFullYear().toString();                                    
    var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based         
    var dd  = this.getDate().toString();             
                            
    return yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0]);
}

