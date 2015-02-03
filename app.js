var express = require("express");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var fs = require("fs");
var https = require("https");
var multer  = require("multer");

var weatherServer = require("./routes/weather/WeatherHttpServer");

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Keep alive
app.use("/alive", function(req, res, next) {
    res.statusCode = 200;
    res.end("alive");
    next();
});

//upload file
app.use(multer({ dest: './uploads/', 
rename: function (fieldname, filename) {
    return filename;
},
onFileUploadStart: function (file) {
  console.log(file.originalname + ' is starting ...')
},
onFileUploadComplete: function (file) {
  console.log(file.fieldname + ' uploaded to  ' + file.path)
}}));

app.use("/v1", weatherServer);

// catch 400 and forward to error handler
app.use(function(req, res, next) {
    res.statusCode = 400;
    res.end(JSON.stringify({"status":{"code":1401,"message":"Api not found"}}));
});

module.exports = app;
