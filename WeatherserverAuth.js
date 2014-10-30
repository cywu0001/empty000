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
var couchbase = require("./couchbase");
var zipcode;
var querycode;
var webresponse;

//Weather information query call back.
var Inforesult = function (err) {
    console.log("== update complete ==");
    blackloudlogger.log(logger, 'info', '== update complete ==');
    couchbase.getData(querycode ,DBreslut);
};


//Couchbase database query call back.
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

        var resp = {};
        resp['code'] = 200;
        resp['response'] = JSON.stringify(data); 
        webresponse.status(200).send(resp);
        blackloudlogger.updateS3();

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
    next();
  });

  function client_authentication (req, res, next) {
    if(req.client.authorized){
        console.log ("authentication pass");
        next();
    } else {
        res.statusCode = 401
        res.end('Unauthorized');
    }
  }

  app.get('/v1/:param', function(req, res){
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
              console.log('weather parameter missing' );
              blackloudlogger.log(logger, 'info', 'weather parameter missing');
              resp['code'] = 400;
              resp['response'] = 'weather parameter missing';
              res.status(200).send(resp);
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


