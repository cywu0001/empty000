var fs = require('fs');
var https = require('https');
var express = require('express');
var passport = require('passport');
var bodyparser = require('body-parser');


HTTP_PORT=88;
HTTPS_PORT=443;

var server,
    ip   = "54.68.203.148",
    port = 443,
    qs = require('querystring'),
    http = require('http');
    url = require('url');

var blackloudlogger = require('./BlackloudLogger');
var logger = blackloudlogger.new();

var currentweather = "_current";
var forecastweather = "_forecast";
var couchbase = require("./Couchbase");
var weather_info = require("./WeatherInformation");
var zipcode;
var querycode;
var webresponse;

var parammiss = {"status":{"code":1400,"message":"Missing parameter"}};
var paramnotfound = {"status":{"code":1401,"message":"Parameter not found"}};
var paramformaterr = {"status":{"code":1402,"message":"Parameter format error"}};
var authfail = {"status":{"code":1403,"message":"Authentication failure"}};
var zipnotfound = {"status":{"code":1404,"message":"Zip code not found"}};
var dbqueryerr = {"status":{"code":1405,"message":"Database query error"}};
var dbdisconn = {"status":{"code":1406,"message":"Database disconnection"}};
var weaservqueryerr = {"status":{"code":1407,"message":"Weather server query error"}};
var weaservdisconn = {"status":{"code":1408,"message":"Weather information server disconnection"}};


//Weather information query call back.
var Inforesult = function (err) {
    console.log("Inforesult error="+err);

    if (err == "completed") {
        console.log("== update complete ==");
        blackloudlogger.log(logger, 'info', '== update complete ==');
        couchbase.getData(querycode ,DBreslut);
    }
    else if (err == "invalid api key" || err == "invalid zip code") {
        blackloudlogger.log(logger, 'info', 'Inforesult err='+err);
        webresponse.statusCode = 400;
        webresponse.end(JSON.stringify(zipnotfound));        
    }
    else if (err == "server error" || err == "parse error") {
        blackloudlogger.log(logger, 'info', 'Inforesult err='+err);
        webresponse.statusCode = 500;
        webresponse.end(JSON.stringify(weaservqueryerr));
    }
    else if (err == "database error") {
        blackloudlogger.log(logger, 'info', 'Inforesult err='+err);
        webresponse.statusCode = 500;
        webresponse.end(JSON.stringify(dbqueryerr));
    }
};


//Couchbase database query call back.
var DBreslut = function (err, data) {
    if (err) {
        console.log("get some error:",err);

        //Weather Info not in DB, query weather info call back function
        weather_info.get(zipcode, Inforesult);
    }

    if(data) {
        console.log("success\n");
        blackloudlogger.log(logger, 'info', 'success');        
        webresponse.statusCode = 200;
        webresponse.end(data);
    }

};

couchbase.setView();//Set view to DB once


var register = function(app){
  app.set('view engine', 'ejs');
  app.use(passport.initialize());
  app.use(bodyparser.json());
  app.use(bodyparser.urlencoded({ extended: false }));
  app.use(function(req, res, next){
    console.log('%s %s', req.method, req.url);
    if (req.url == "/") {
        //Missing parameter:1400.
        blackloudlogger.log(logger, 'info', 'Missing parameter');
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else if (req.url == "/v1") {
        //Parameter not found:1401.
        blackloudlogger.log(logger, 'info', 'Parameter not found');
        res.statusCode = 400;
        res.end(JSON.stringify(paramnotfound));
    }
    else if (req.url.match("/v1/currentweather")==null && req.url.match("/v1/forecastweather")==null) {
        //Parameter format error:1402.
        blackloudlogger.log(logger, 'info', 'Parameter format error');
        res.statusCode = 400;
        res.end(JSON.stringify(paramformaterr));
    }
    else {
        next();
    }
  });

  function client_authentication (req, res, next) {
    if(req.client.authorized){
        console.log ("authentication pass");
        next();
    } else {
        // Authentification fail:1403.
        console.log ("Authentification fail");
        blackloudlogger.log(logger, 'info', 'Authentification fail');
        res.statusCode = 400;
        res.end(JSON.stringify(authfail));
    }
  }

  app.get('/v1/:param', client_authentication, function(req, res) {
      var resp = {};
      var paramexit = false;
      var weathertype = req.params['param'];
      console.log(req.query['zipcode']);
      console.log(req.params['param']);
      zipcode = req.query['zipcode'];
      blackloudlogger.log(logger, 'info', 'weather zipcode='+zipcode);

      if (weathertype == "currentweather" || weathertype == "forecastweather") {     
          if (zipcode) {
              paramexit = true;
              if (weathertype == "currentweather") {
                  querycode = zipcode.concat(currentweather);
              }
              else if (weathertype == "forecastweather") {          
                  querycode = zipcode.concat(forecastweather);
              }
              blackloudlogger.log(logger, 'info', 'querycode='+querycode);
          }

          if (paramexit == false) {
              // Zip code not found:1404.
              blackloudlogger.log(logger, 'info', 'weather zipcode not found');
              res.statusCode = 400;
              res.end(JSON.stringify(zipnotfound));
              return 0;
          }
          
          if (querycode) {
              webresponse = res;
              couchbase.getData(querycode ,DBreslut);
          }
      }
  });

};

var http = express();
register(http);
http.listen(HTTP_PORT);

var options = {
	key: fs.readFileSync(__dirname + "/ssl.key"),
	cert: fs.readFileSync(__dirname + "/ssl.cert"),
	ca:[fs.readFileSync(__dirname + "/ca.pem")],
	requestCert: true,
	rejectUnauthorized: false,
};
https.createServer(options, http).listen(HTTPS_PORT);
blackloudlogger.log(logger, 'info', 'Server running at https ip='+ip);
blackloudlogger.log(logger, 'info', 'Server running at https port='+port);
