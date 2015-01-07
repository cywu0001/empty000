
var linebyline = require('line-by-line');
var log2s3 = require('./BlackloudLog2S3');
var fs = require('fs');

var resultList = [];

function parse(params, callback)
{
	var fileString = '';
	var fileName = '';

	// clear resultList first in every round
	resultList.length = 0;

	console.log(params.level);

	if( params.type != 'debug' && params.type != 'exceptions' )
	{
		console.log('Error on type definition.');
		return -1;
	}
	if( params.level == '' || params.level == null )
	{
		console.log('Error on level definition.');
		return -1;
	}
	if( params.sdate == null || params.edate == null || params.edate < params.sdate )
	{
		console.log('Error on date range.');
		return -1;
	}
	if( params.stime == null || params.etime == null || params.etime < params.stime )
	{
		console.log('Error on time range.');
		return -1;
	}
	if( params.project == '' || params.project == null )
	{
		console.log('Error on project definition.');
		return -1;
	}

	var dateList = getDateList(params.sdate, params.edate);
	var fileList = getFileList(params.project, params.type, dateList);
	parseFiles(fileList, params, callback);
}
/**
 *		Get date string list 
 *		Ranging from startdate to enddate
**/
function getDateList(startdate, enddate) {

	var start = new Date(startdate);
	var end = new Date(enddate);
	var tmpdate = new Date(startdate);
	var dateList = [];
	var i = 0;
	do {
		tmpdate.setDate(start.getDate() + (i++));
		dateList.push(tmpdate.yyyymmdd());
		//console.log('get date ' + tmpdate.yyyymmdd());
	}while(tmpdate < end);

	//console.log(dateList);

	delete start;
	delete end;
	delete tmpdate;

	return dateList;
}

/**
 *		Get file string list 
 *		which concatenates type(debug/exceptions) with dateList(date)
**/
function getFileList(pid, type, dateList) {
	var fileList = [];
	for(var i=0 ; i<dateList.length ; i++)
	{
		fileName = pid + '/' + type + '.log.' +  dateList[i];
		fileString = __dirname + '/log/' + fileName;
		fileList.push(fileString);
	}
	//console.log(fileList);
	return fileList;
}

/**
 *		Check if local files exist 
 *		if not, download from S3 server
 *		after the file is prepared, parse it.
**/
function parseFiles(fileList, params, callback) {
		
	if( fileList.length == 0 )
	{
		console.log('done downloading & parsing all files');
		// after all files were parsed
		// return the resultList to frontend
		callback(resultList);
		return;
	}

	var listIndex = 0;
	var file = fileList[listIndex];
	var fileNameIndex = file.search('/log/');
	var fileString = file.substring(fileNameIndex+1);
	console.log(fileString);

	// check if the file is prepared on local storage
	// if not, then download from S3 and do the data parsing
	// if yes, then just parse the data
	if(!log2s3.checkFile(file))
	{
		console.log('local file: ' + fileString + ' not exist, download from S3 server.');
		log2s3.getFile(fileString, function(err) { 
			//console.log(err);
			if( !err )
			{
				parseData(file, params, function() {
					fileList.shift();
					parseFiles(fileList, params, callback);
				});
			}
			else
			{
				console.log('file ' + file + ' not found... skip!');
				fileList.shift();
				parseFiles(fileList, params, callback);
			}
		});
	}
	else
	{
		console.log('local file: ' + fileString + ' exists!');
		parseData(file, params, function() {		
			// callback function
			// after parsing each file, delete the first element of fileList and do the next round
			fileList.shift();
			parseFiles(fileList, params, callback);
		});
	}
}

/**
 *		Parse data from files specified by fileList 
 *		using line-by-line reader to parse the data we want
**/
function parseData(file, params, callback) {

	var lr, dateString, levelString;
	lr = new linebyline(file);	
	dateString = file.split('.log.').pop();
	levelString = params.level;
	//console.log(dateString);
	
	lr.on('error', function(err) {
		console.log('Parsing Error on file: ' + file + ' : ' + err);
	});

	lr.on('line', function(line) {
		var data = JSON.parse(line);
		//console.log(line);
		if(	data['timestamp'] >= params.stime &&
			data['timestamp'] <= params.etime)
		{
			// select label == 'All' (for no label case) or specific label with specific types
			if( (params.label == 'All' || data['label'] == params.label) &&
				 params.level.indexOf(data['level']) > -1 )
			{
				data['date'] = dateString;
				resultList.push(data);
			}
		} 
	});

	lr.on('end', function() {
		// after each round, raise the callback function.
		//console.log(resultList);
		callback();
	});
	
}

// For generating customed timestamp info.
Date.prototype.yyyymmdd = function() {
	var yyyy = this.getFullYear().toString();                                    
    var mm = (this.getMonth()+1).toString(); // getMonth() is zero-based         
    var dd  = this.getDate().toString();             
                            
    return yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0]);
}

module.exports = {
	query : function(params, callback) {
		console.log('querying.....');
		console.log('type = ' + params.type);
		console.log('sdate = ' + params.sdate);
		console.log('edate = ' + params.edate);
		console.log('label = ' + params.label);
		console.log('level = ' + params.level);
		console.log('stime = ' + params.stime);
		console.log('etime = ' + params.etime);

		parse(params, callback);
	} 
}
