var server,
    ip   = "54.68.203.148",
    port = 443,
    qs = require('querystring'),
    http = require('http');
    url = require('url');

var https = require('https'),
    fs = require("fs");

var options = {
    key: fs.readFileSync('./privatekey.pem'),
    cert: fs.readFileSync('./certificate.pem')
};

var blackloudlogger = require('./BlackloudLogger');
var logger = blackloudlogger.new();

var currentweather = "_current";
var forecastweather = "_forecast";
var couchbase = require("./Couchbase");
var zipcode;
var querycode;
var webresponse;

//Weather information query call back.
/*
var Inforesult = function (err) {
    console.log("== update complete ==");
    blackloudlogger.log(logger, 'info', '== update complete ==');
    couchbase.getData(querycode ,DBreslut);
};
*/


//Couchbase database query call back.
/*
var DBreslut = function (err, data) {
    if (err) { 
        console.log("get some error:\n",err);
        blackloudlogger.log(logger, 'info', 'get some error:'+err);

	//Weather Info not in DB, query weather info
	var weather_info = require("./weather_info");

	//Call back fucnfion
	weather_info.get(zipcode, Inforesult);
    }
    if(data) {
	console.log("success\n");
        blackloudlogger.log(logger, 'info', 'success');

	webresponse.end(data);
        blackloudlogger.updateS3();
    }
};

couchbase.setView();//Set view to DB once
*/

https.createServer(options, function (req, res) {
    console.log("req.url="+req.url);
    blackloudlogger.log(logger, 'info', 'req.url='+req.url);

    var path = url.parse(req.url),
        parameter = qs.parse(path.query);

    console.log("path.pathname="+path.pathname);
    blackloudlogger.log(logger, 'info', 'path.pathname='+path.pathname);

    if (path.pathname == "/v1/currentweather" || path.pathname == "/v1/forecastweather") {
        //check zip code
	var paramexit = false;
	zipcode = url.parse(req.url, true).query['zipcode'];

	console.log('weather zipcode= ' + zipcode);
        blackloudlogger.log(logger, 'info', 'weather zipcode='+zipcode);

	if (zipcode) {
	    paramexit = true;
	    if (path.pathname == "/v1/currentweather") {
	        querycode = zipcode.concat(currentweather);
	    }
	    else if (path.pathname == "/v1/forecastweather") {
		querycode = zipcode.concat(forecastweather);
	    }
	    
            console.log("querycode="+ querycode);
            blackloudlogger.log(logger, 'info', 'querycode='+querycode);
	}
	
        if (paramexit == false) {
	    console.log('weather parameter missing' );
            blackloudlogger.log(logger, 'info', 'weather parameter missing');

	    res.writeHead(400, {'Content-Type': 'text/plain'});
	    res.end('weather parameter missing end\n');
	    return 0;
	}
	
        res.writeHead(200, {'Content-Type': 'text/plain'});
		
	if (querycode) {
	    //Get information from DB
	    webresponse = res;
//	    couchbase.getData(querycode ,DBreslut);
//add temp
            res.end('weather test end');
	}
  }
}).listen(port);


console.log("Server running at https://" + ip + ":" + port);
blackloudlogger.log(logger, 'info', 'Server running at https ip='+ip);
blackloudlogger.log(logger, 'info', 'Server running at https port='+port);

