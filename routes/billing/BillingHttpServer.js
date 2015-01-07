var express = require("express");
var router = express.Router();
var fs = require("fs");
var dotEnv = require("dotenv");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);
var BlackloudLogger = require("../../utils/BlackloudLogger");
var logger = new BlackloudLogger(env.PROJECT_NAME, "BillingHttpServer");
var purchasingStat = require("./BillingPurchasingStat");
var billingAvailableProduct = require("./BillingAvailableProduct");
var blackloudTokenVerify = require("./BlackloudTokenVerify");
var billingPurchaseQuery = require("./BillingPurchaseQuery");
var billingVerifyReceipt = require("./BillingVerifyReceipt");
var billingRenewPurchasedProduct = require("./BillingRenewPurchasedProduct");

var parammiss = {"status":{"code":1400,"message":"Missing parameter"}};
var paramformaterr = {"status":{"code":1402,"message":"Parameter format error"}};
var authfail = {"status":{"code":1403,"message":"Authentication failure"}};

function parseUserName(params) {
    index = params.token.indexOf(":");
    userName = params.token.substring(0,index);
    params.user_name = userName;
    return params;
}

function tokenVerify(req, res, next) {
    if(req.body.token == null) {
        logger.log("info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        blackloudTokenVerify.verify(req.body.token, next, function() {
            logger.log("info", "Authentication failure");
            res.statusCode = 400;
            res.end(JSON.stringify(authfail));
        }); 
    }
}

function receiptDataVerify(req, res, next) {
    if(req.body.receipt_data == null) {
        logger.log("info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        next(); 
    }
}

function applePasswordVerify(req, res, next) {
    if(req.body.apple_password == null) {
        logger.log("info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        next(); 
    }
}

function packageNameVerify(req, res, next) {
    if(req.body.package_name == null) {
        logger.log("info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        next(); 
    }
}

function signatureVerify(req, res, next) {
    if(req.body.signature == null) {
        logger.log("info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        next(); 
    }
}

function userIDVerify(req, res, next) {
    if(req.body.user_ID == null) {
        logger.log("info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        next(); 
    }
}

function deviceIDVerify(req, res, next) {
    if(req.body.device_ID == null) {
        logger.log("info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        next(); 
    }
}

function productIDVerify(req, res, next) {
    if(req.body.product_ID == null) {
        logger.log("info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        next(); 
    }
}

function startDateVerify(req, res, next) {
    if(req.body.start_date == null) {
        logger.log("info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        next(); 
    }
}

function endDateVerify(req, res, next) {
    if(req.body.end_date == null) {
        logger.log("info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        next(); 
    }
}

/* GET server version. */
router.get("/server_version", function(req, res) {
    res.statusCode = 200;
    res.end(env.SERVER_VERSION);
});

router.post("/available_product"
            ,tokenVerify
            ,packageNameVerify
            ,function(req, res) {
    logger.log("info", "available_product: " + JSON.stringify(req.body));
    params = parseUserName(req.body);    
    billingAvailableProduct.get(params, res);
});

router.post("/verify_receipt_apple"
            ,tokenVerify
            ,receiptDataVerify
            ,applePasswordVerify
            ,deviceIDVerify
            ,productIDVerify
            ,packageNameVerify
            ,function(req, res) {
    logger.log("info", "verify_receipt_apple: " + JSON.stringify(req.body));
    params = parseUserName(req.body); 
    billingVerifyReceipt.apple(params, res);
});

router.post("/verify_receipt_google"
            ,tokenVerify
            ,receiptDataVerify
            ,deviceIDVerify
            ,productIDVerify
            ,packageNameVerify
            ,signatureVerify
            ,function(req, res) {
    logger.log("info", "verify_receipt_google: " + JSON.stringify(req.body));
    params = parseUserName(req.body); 
    billingVerifyReceipt.google(params, res);
});

router.post("/query_purchased_product"
            ,tokenVerify
            ,deviceIDVerify
            ,function(req, res) {
    logger.log("info", "query_purchased_product: " + JSON.stringify(req.body));
    params = parseUserName(req.body); 
    billingPurchaseQuery.query_purchased_product(params, res);

});

router.post("/query_purchased_all_product"
            ,tokenVerify
            ,packageNameVerify
            ,function(req, res) {
    logger.log("info", "query_purchased_all_product: " + JSON.stringify(req.body));
    params = parseUserName(req.body); 
    billingPurchaseQuery.query_purchased_all_product(params, res);

});

router.post("/query_purchased_history"
            ,tokenVerify
            ,deviceIDVerify
            ,packageNameVerify
            ,function(req, res) {
    logger.log("info", "query_purchased_history: " + JSON.stringify(req.body));
    params = parseUserName(req.body); 
    billingPurchaseQuery.query_purchased_history(params, res);
});

router.post("/is_purchasing"
            ,tokenVerify
            ,deviceIDVerify
            ,function(req, res) {
    logger.log("info", "is_purchasing: " + JSON.stringify(req.body));
    params = parseUserName(req.body);
    purchasingStat.get(params, res);
});

router.post("/set_purchasing"
            ,tokenVerify
            ,deviceIDVerify
            ,function(req, res) {
    logger.log("info", "set_purchasing: " + JSON.stringify(req.body));
    params = parseUserName(req.body);
    purchasingStat.set(params, res);
});

router.post("/renew_purchased_product"
            ,tokenVerify
            ,deviceIDVerify
            //,productIDVerify
            ,function(req, res) {
    logger.log("info", "renew_purchased_product: " + JSON.stringify(req.body));
    params = parseUserName(req.body);
    billingRenewPurchasedProduct.renew(params, res);
});

router.post("/renew_purchased_all_product"
            ,tokenVerify    
            ,deviceIDVerify
            ,function(req, res) {
    logger.log("info", "renew_purchased_all_product: " + JSON.stringify(req.body));
    params = parseUserName(req.body);
    billingRenewPurchasedProduct.renewall(params, res);
});


router.post("/is_enable_trial"
            ,tokenVerify
            ,deviceIDVerify
            ,function(req, res) {
    logger.log("info", "is_enable_trial: " + JSON.stringify(req.body));
    params = parseUserName(req.body);
    billingPurchaseQuery.is_enable_trial(params, res);

});

router.post("/enable_trial"
            ,tokenVerify
            ,deviceIDVerify
            ,packageNameVerify
            ,function(req, res) {
    logger.log("info", "enable_trial: " + JSON.stringify(req.body));
    params = parseUserName(req.body);
    billingPurchaseQuery.enable_trial(params, res);

});

module.exports = router;
