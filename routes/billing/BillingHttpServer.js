var express = require("express");
var router = express.Router();
var fs = require("fs");
var dotEnv = require("dotenv");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);
var BlackCloudLogger = require("../../utils/BlackloudLogger");
var logger = BlackCloudLogger.new(env.PROJECT_NAME, "BillingHttpServer");
var purchasingStat = require("./BillingPurchasingStat");
var blackloudTokenVerify = require("./BlackloudTokenVerify");
var billingPurchaseQuery = require("./BillingPurchaseQuery");
var billingVerifyReceipt = require("./BillingVerifyReceipt");

var parammiss = {"status":{"code":1400,"message":"Missing parameter"}};
var paramformaterr = {"status":{"code":1402,"message":"Parameter format error"}};
var authfail = {"status":{"code":1403,"message":"Authentication failure"}};

function tokenVerify(req, res, next) {
    if(req.body.token == null) {
        BlackCloudLogger.log(logger, "info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        blackloudTokenVerify.verify(req.body.token, next, function() {
            BlackCloudLogger.log(logger, "info", "Authentication failure");
            res.statusCode = 400;
            res.end(JSON.stringify(authfail));
        }); 
    }
}

function receiptDataVerify(req, res, next) {
    if(req.body.receipt_data == null) {
        BlackCloudLogger.log(logger, "info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        //How to check it is valid?
        next(); 
    }
}

function passwordVerify(req, res, next) {
    if(req.body.password == null) {
        BlackCloudLogger.log(logger, "info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        //How to check it is valid?
        next(); 
    }
}

function packageNameVerify(req, res, next) {
    if(req.body.package_name == null) {
        BlackCloudLogger.log(logger, "info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        //How to check it is valid?
        next(); 
    }
}

function subscriptionIDVerify(req, res, next) {
    if(req.body.subscription_ID == null) {
        BlackCloudLogger.log(logger, "info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        //How to check it is valid?
        next(); 
    }
}

function purchaseTokenVerify(req, res, next) {
    if(req.body.purchase_token == null) {
        BlackCloudLogger.log(logger, "info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        //How to check it is valid?
        next(); 
    }
}

function userIDVerify(req, res, next) {
    if(req.body.user_ID == null) {
        BlackCloudLogger.log(logger, "info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        //How to check it is valid?
        next(); 
    }
}

function deviceIDVerify(req, res, next) {
    if(req.body.device_ID == null) {
        BlackCloudLogger.log(logger, "info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        //How to check it is valid? is there data set?
        next(); 
    }
}

function productIDVerify(req, res, next) {
    if(req.body.product_ID == null) {
        BlackCloudLogger.log(logger, "info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        //How to check it is valid? is there data set?
        next(); 
    }
}

function startDateVerify(req, res, next) {
    if(req.body.start_date == null) {
        BlackCloudLogger.log(logger, "info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        //How to check it is valid?
        next(); 
    }
}

function endDateVerify(req, res, next) {
    if(req.body.end_date == null) {
        BlackCloudLogger.log(logger, "info", "Missing parameter");
        res.statusCode = 400;
        res.end(JSON.stringify(parammiss));
    }
    else {
        //How to check it is valid?
        next(); 
    }
}

router.post("/available_product"
            ,tokenVerify
            ,packageNameVerify
            ,function(req, res) {
    BlackCloudLogger.log(logger, "info", "available_product: " + JSON.stringify(req.body));      
    res.statusCode = 200;
    res.end("200 OK");
});

router.post("/verify_receipt_apple"
            ,tokenVerify
            ,receiptDataVerify
            ,passwordVerify
            ,function(req, res) {
    BlackCloudLogger.log(logger, "info", "verify_receipt_apple: " + JSON.stringify(req.body));
    billingVerifyReceipt.apple(req.body, res);
});

router.post("/verify_receipt_google"
            ,tokenVerify
            ,packageNameVerify
            ,subscriptionIDVerify
            ,purchaseTokenVerify
            ,function(req, res) {
    BlackCloudLogger.log(logger, "info", "verify_receipt_google: " + JSON.stringify(req.body));
    billingVerifyReceipt.google(req.body, res);
});

router.post("/query_purchased_product"
            ,tokenVerify
            ,userIDVerify
            ,deviceIDVerify
            ,function(req, res) {
    BlackCloudLogger.log(logger, "info", "query_purchased_product: " + JSON.stringify(req.body));
    billingPurchaseQuery.query_purchased_product(res, req.body.user_ID, req.body.device_ID);

});

router.post("/query_purchased_all_product"
            ,tokenVerify
            ,userIDVerify
            ,packageNameVerify
            ,function(req, res) {
    BlackCloudLogger.log(logger, "info", "query_purchased_all_product: " + JSON.stringify(req.body));
    billingPurchaseQuery.query_purchased_all_product(res, req.body.user_ID, req.body.package_name);

});

router.post("/query_purchased_history"
            ,tokenVerify
            ,userIDVerify
            ,deviceIDVerify
            ,packageNameVerify
            ,function(req, res) {
    BlackCloudLogger.log(logger, "info", "query_purchased_history: " + JSON.stringify(req.body));
    billingPurchaseQuery.query_purchased_history(res, req.body.user_ID, req.body.package_name);
});

router.post("/is_purchasing"
            ,tokenVerify
            ,userIDVerify
            ,deviceIDVerify
            ,function(req, res) {
    BlackCloudLogger.log(logger, "info", "is_purchasing: " + JSON.stringify(req.body));
    purchasingStat.get(req.body, res);
});

router.post("/set_purchasing"
            ,tokenVerify
            ,userIDVerify
            ,deviceIDVerify
            ,function(req, res) {
    BlackCloudLogger.log(logger, "info", "set_purchasing: " + JSON.stringify(req.body));
    purchasingStat.set(req.body, res);
});

router.post("/renew_purchased_product"
            ,tokenVerify
            ,userIDVerify
            ,deviceIDVerify
            ,productIDVerify
            ,function(req, res) {
    BlackCloudLogger.log(logger, "info", "renew_purchased_product: " + JSON.stringify(req.body));
    res.statusCode = 200;
    res.end("200 OK");
});

router.post("/renew_purchased_all_product"
            ,tokenVerify
            ,userIDVerify
            ,deviceIDVerify
            ,function(req, res) {
    BlackCloudLogger.log(logger, "info", "renew_purchased_all_product: " + JSON.stringify(req.body));
    res.statusCode = 200;
    res.end("200 OK");
});


router.post("/is_enable_trial"
            ,tokenVerify
            ,deviceIDVerify
            ,function(req, res) {
    BlackCloudLogger.log(logger, "info", "is_enable_trial: " + JSON.stringify(req.body));

    billingPurchaseQuery.is_enable_trial(res, req.body.device_ID);

});

router.post("/enable_trial"
            ,tokenVerify
            ,userIDVerify
            ,deviceIDVerify
            ,function(req, res) {
    BlackCloudLogger.log(logger, "info", "enable_trial: " + JSON.stringify(req.body));

    billingPurchaseQuery.enable_trial(res, req.body.user_ID, req.body.device_ID);

});



module.exports = router;
