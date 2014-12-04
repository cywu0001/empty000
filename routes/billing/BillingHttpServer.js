var express = require("express");
var router = express.Router();
var fs = require("fs");
var dotEnv = require("dotenv");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);
var BlackCloudLogger = require("../../utils/BlackloudLogger");
var logger = BlackCloudLogger.new(env.PROJECT_NAME, "BillingHttpServer");
var purchasingStat = require("./BillingPurchasingStat");

router.post("/available_product", function(req, res) {
    BlackCloudLogger.log(logger, "info", "available_product: " + req.body);      
    res.statusCode = 200;
    res.end("200 OK");
});

router.post("/verify_receipt_apple", function(req, res) {
    BlackCloudLogger.log(logger, "info", "verify_receipt_apple: " + req.body);
    res.statusCode = 200;
    res.end("200 OK");
});

router.post("/verify_receipt_google", function(req, res) {
    BlackCloudLogger.log(logger, "info", "verify_receipt_google: " + req.body);
    res.statusCode = 200;
    res.end("200 OK");
});

router.post("/query_purchased_product", function(req, res) {
    BlackCloudLogger.log(logger, "info", "query_purchased_product: " + req.body);
    res.statusCode = 200;
    res.end("200 OK");
});

router.post("/query_purchased_all_product", function(req, res) {
    BlackCloudLogger.log(logger, "info", "query_purchased_all_product: " + req.body);
    res.statusCode = 200;
    res.end("200 OK");
});

router.post("/query_purchased_history", function(req, res) {
    BlackCloudLogger.log(logger, "info", "query_purchased_history: " + req.body);
    res.statusCode = 200;
    res.end("200 OK");
});

router.post("/is_purchasing", function(req, res) {
    BlackCloudLogger.log(logger, "info", "is_purchasing: " + req.body);
    var isPurchasing = purchasingStat.get(req.body.user_ID+req.body.device_ID+req.body.product_ID);
        
    res.statusCode = 200;
    res.end("200 OK");
});

router.post("/set_purchasing", function(req, res) {
    BlackCloudLogger.log(logger, "info", "set_purchasing: " + req.body);
    purchasingStat.set(req.body.user_ID+req.body.device_ID+req.body.product_ID);
    res.statusCode = 200;
    res.end("200 OK");
});

router.post("/renew_purchased_product", function(req, res) {
    BlackCloudLogger.log(logger, "info", "renew_purchased_product: " + req.body);
    res.statusCode = 200;
    res.end("200 OK");
});

router.post("/renew_purchased_all_product", function(req, res) {
    BlackCloudLogger.log(logger, "info", "renew_purchased_all_product: " + req.body);
    res.statusCode = 200;
    res.end("200 OK");
});

module.exports = router;
