var express = require("express");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var fs = require("fs");
var https = require("https");

var weatherServer = require("./routes/weather/WeatherHttpServer");
var billingServer = require("./routes/billing/BillingHttpServer");

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

app.use("/v1", weatherServer);
app.use("/v1/billing", billingServer);

// catch 400 and forward to error handler
app.use(function(req, res, next) {
    res.statusCode = 400;
    res.end(JSON.stringify({"status":{"code":1401,"message":"Api not found"}}));
});

module.exports = app;
