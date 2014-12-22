var http = require("http");
var couchbase = require('couchbase');
var merge = require('merge');
var fs = require("fs");
var dotEnv = require("dotenv");
var file = fs.readFileSync(__dirname + "/.env");
var env = dotEnv.parse(file);
var BlackloudLogger = require("../../utils/BlackloudLogger");
var logger = BlackloudLogger.new(env.PROJECT_NAME, "Couchbase");

var bucketfd = env.BUCKETFD;
var couchbaseserver = env.COUCHBASE_SERVER;
var c_couchbase = env.C_COUCHBASE;
var success = 0;

function loadData(key ,result) {
 
 // Get the data in Couchbase using the get method ()
   var cb = new couchbase.Cluster(couchbaseserver);
   var myBucket = cb.openBucket(bucketfd);
   myBucket.get(key,function(err,data) {
   if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
     console.log("Failed to load data\n");
	 BlackloudLogger.log(logger, "info", "loadData():Failed to load data "+key);
	 result(err, null);
	 return;
   }
   var out_json = JSON.parse(data.value);
   result(err, JSON.stringify(out_json));
   myBucket.disconnect();
 });
}


function saveData(key,w_data ,result) {
 console.log("saveData....\n");
 // save the data in Couchbase using the insert method ()
   var cb = new couchbase.Cluster(couchbaseserver);
   var myBucket = cb.openBucket(bucketfd);
   myBucket.insert(key, JSON.stringify(w_data), function(err,data) {
   if (err && err != 12) { // 12 : LCB_KEY_EEXISTS 
        console.log("Failed to save data\n");
    	myBucket.replace(key, JSON.stringify(w_data), function(err,data){
			if (err && err != 12) { // 12 : LCB_KEY_EEXISTS
				console.log("Failed to replace data\n");
				BlackloudLogger.log(logger, "info", "saveData():Failed to replace data "+key);
				result(err, null);
			}else
			{
				console.log("Replace data success\n");
				result(success, null);
			}
		    myBucket.disconnect();

		});
   }else
   {
	  console.log("save data success\n");	  
   	  result(success, null);
	  myBucket.disconnect();
   }
 });
}

function filter_device_ID(data,value,result){

	var check =false;
	data.forEach(function(val,idx) {
		if(val["device_ID"] == value)
		{
			check = true
			return;
		}
	});

	result(check,null);
}

function createHistoryData(parameter,result) {

	var ProductObj;
	ProductObj = {
		product_ID : parameter.product_ID,
		start_Date : parameter.start_Date,
		end_Date : parameter.end_Date,
		store : parameter.store
        };

	var DeviceObj;
	DeviceObj = {
		device_ID : parameter.device_ID,
		product : [
			ProductObj
		]		
        };
	var HistoryObj;
	HistoryObj = {
		user_ID : parameter.user_ID,
		product : {
			product_history : [
				DeviceObj
			]
		}			
	};
	saveData(parameter.user_ID+"_Purchased_History",HistoryObj ,function(err) {
	if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
	     console.log("Failed to create History data\n");
	}
	result(err,null);
	});
}

function updateHistoryData(data,parameter,result) {
	var datajson = JSON.parse((data));
	var product_history = [];
	var device_ID;
	var user_ID;
	var deviceObj;
	var productObj;
	var check;
	user_ID = datajson["user_ID"];

	filter_device_ID(datajson["product"]["product_history"],parameter.device_ID,function(err) {
		console.log(err);
		check = err;

	if(check == false)
	{
		datajson["product"]["product_history"].forEach(function(val,idx) {		
			console.log("No find the same device_ID");
			//console.log(JSON.stringify(val));
			product_history.push(val);
		});
		productObj = {
			product_ID : parameter.product_ID,
			start_Date : parameter.start_Date,
			end_Date : parameter.end_Date,
			store : parameter.store
		};
		var historyObj = {
			device_ID : parameter.device_ID,
			product : [
				productObj
			]
		}
		product_history.push(historyObj);
	}else
	{
		datajson["product"]["product_history"].forEach(function(val,idx) {		
			if(val["device_ID"] == parameter.device_ID)
			{
				console.log("find the same device_ID");
				//console.log(JSON.stringify(val));
				//console.log(idx);
				productObj = {
					product_ID : parameter.product_ID,
					start_Date : parameter.start_Date,
					end_Date : parameter.end_Date,
					store : parameter.store
				};
				val["product"].push(productObj);
				deviceObj = {
					device_ID : parameter.device_ID,
					product : val["product"]
				};
				product_history.push(deviceObj);	
			}else
			{
				console.log("No find the same device_ID");
				//console.log(JSON.stringify(val));
				product_history.push(val);		
			}
		
		});
	}
	});

	//console.log(product_history);	
	var purchased_HistoryObj;
	purchased_HistoryObj = {
		user_ID : user_ID,
		product : {
			product_history :
				product_history
		}			
	};
	//console.log(JSON.stringify(purchased_HistoryObj));

	saveData(parameter.user_ID+"_Purchased_History",purchased_HistoryObj ,function(err) {
	if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
	     console.log("Failed to save data\n");
	}
	result(err,null);
	});	
}

function createPurchasedData(parameter,result) {

	var ProductObj;
	ProductObj = {
		device_ID : parameter.device_ID,
		product_ID : parameter.product_ID,
		start_Date : parameter.start_Date,
		end_Date : parameter.end_Date,
		store : parameter.store,
		receipt_data : parameter.receipt_data,
		package_name : parameter.package_name
        };

	var PurchasedObj;
	PurchasedObj = {
		user_ID : parameter.user_ID,
		product : {
			product_list : [
				ProductObj
			]
		}			
	};
	saveData(parameter.user_ID+"_Purchased_Product",PurchasedObj ,function(err) {
	if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
	     console.log("Failed to create Purchased Product data\n");
	}
	result(err,null);
	});
}


function updatePurchasedData(data,parameter,result) {
	var datajson = JSON.parse((data));
	var purchased_Product = [];
	var device_ID;
	var user_ID;
	var deviceObj;
	var productObj;
	var check;
	user_ID = datajson["user_ID"];

	filter_device_ID(datajson["product"]["product_list"],parameter.device_ID,function(err) {
		console.log(err);
		check = err;

	if(check == false)
	{
		datajson["product"]["product_list"].forEach(function(val,idx) {		
			console.log("No find the same device_ID");
			//console.log(JSON.stringify(val));
			purchased_Product.push(val);
		});
		productObj = {
			device_ID : parameter.device_ID,
			product_ID : parameter.product_ID,
			start_Date : parameter.start_Date,
			end_Date : parameter.end_Date,
			store : parameter.store,
			receipt_data : parameter.receipt_data,
			package_name : parameter.package_name
		};
		purchased_Product.push(productObj);
	}else
	{
		datajson["product"]["product_list"].forEach(function(val,idx) {		
			if(val["device_ID"] == parameter.device_ID)
			{
				console.log("find the same device_ID");
				//console.log(JSON.stringify(val));
				//console.log(idx);
				productObj = {
					device_ID : parameter.device_ID,
					product_ID : parameter.product_ID,
					start_Date : parameter.start_Date,
					end_Date : parameter.end_Date,
					store : parameter.store,
					receipt_data : parameter.receipt_data,
					package_name : parameter.package_name
				};
				purchased_Product.push(productObj);	
			}else
			{
				console.log("No find the same device_ID");
				//console.log(JSON.stringify(val));
				purchased_Product.push(val);		
			}
		
		});
	}
	});
	//console.log(purchased_Product);	
	var purchased_Obj;
	purchased_Obj = {
		user_ID : user_ID,
		product : {
			product_list :
				purchased_Product
		}			
	};
	//console.log(JSON.stringify(purchased_Obj));

	saveData(parameter.user_ID+"_Purchased_Product",purchased_Obj ,function(err) {
	if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
	     console.log("Failed to save data\n");
	}
	result(err,null);
	});
}

//=====================================================================================================================

exports.insertData = function insertData(key,w_data ,result) {
 console.log("insertData....\n");
 // Insert the data in Couchbase using the add method ()
   var cb = new couchbase.Cluster(couchbaseserver);
   var myBucket = cb.openBucket(bucketfd);
   myBucket.insert(key, JSON.stringify(w_data), function(err,data) {
   if (err && err != 12) { // 12 : LCB_KEY_EEXISTS 
        console.log("Failed to insert data\n");
    	myBucket.replace(key, JSON.stringify(w_data), function(err,data){
			if (err && err != 12) { // 12 : LCB_KEY_EEXISTS
				console.log("Failed to replace data\n");
				BlackloudLogger.log(logger, "info", "insertData():Failed to replace data "+key);
				result(err, null);
			}else
			{
				console.log("Replace data success\n");
				result(success, null);
			}			
		    myBucket.disconnect();

		});
   }else
   {
	  console.log("Insert data success\n");	  
   	  result(success, null);
	  myBucket.disconnect();
   }
 });
}

exports.insertHistoryData = function insertPurchasedData(parameter,result) {
 	console.log("insertHistoryData....\n");

	loadData(parameter.user_ID+"_Purchased_History",function(err,data) {
	if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
	     console.log("Failed to insert history data\n");
	     createHistoryData(parameter,result);
	}else
	{
	     console.log("Successed to insert history data\n");
	     updateHistoryData(data,parameter,result);
	}
	});
}


exports.insertPurchasedData = function insertPurchasedData(parameter,result) {
 	console.log("insertPurchasedData....\n");

	loadData(parameter.user_ID+"_Purchased_Product",function(err,data) {
	if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
	     console.log("Failed to insert Purchased data\n");
	     createPurchasedData(parameter,result);
	}else
	{
	     console.log("Successed to insert Purchased data\n");
	     updatePurchasedData(data,parameter,result);
	}
	});
}

exports.replaceData = function replaceData(key,w_data ,result) {
 console.log("replaceData....\n");
 // Insert the data in Couchbase using the add method ()
   var cb = new couchbase.Cluster(couchbaseserver);
   var myBucket = cb.openBucket(bucketfd);
	myBucket.replace(key, w_data, function(err,data){
		if (err && err != 12) { // 12 : LCB_KEY_EEXISTS
			console.log("Failed to replace data\n");
			BlackCloudLogger.log(logger, "info", "replaceData():Failed to replace data "+key);
			result(err, null);
		}else
		{
			console.log("Replace data success\n");
			result(success, null);
		}
	    myBucket.disconnect();

	});
}

exports.getZIP = function getZIP(result) {
  // retrieve data from a view
  var baseview = require('baseview')({url: c_couchbase,bucket: bucketfd});
  baseview.view('design_weather', 'basic_zip', function(error, data) {
    //console.log(error, data);
    result(error, data);
  });
 }

exports.getUser_ID = function getUser_ID(result) {
  // retrieve data from a view
  var baseview = require('baseview')({url: c_couchbase,bucket: bucketfd});
  baseview.view('user_id', 'user_id', function(error, data) {
    //console.log(error, data);
    result(error, data);
  });
 }

exports.getData = function getData(key ,result) {
 
 // Get the data in Couchbase using the get method ()
   var cb = new couchbase.Cluster(couchbaseserver);
   var myBucket = cb.openBucket(bucketfd);
   myBucket.get(key,function(err,data) {
   if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
     console.log("Failed to get data\n");
	 BlackloudLogger.log(logger, "info", "getData():Failed to get data "+key);
	 result(err, null);
	 return;
   }
   var out_json = JSON.parse(data.value);
   result(err, JSON.stringify(out_json));
   myBucket.disconnect();
 });
}

exports.deleteData = function deleteData(key ,result) {
 
 // delete the data in Couchbase using the remove method ()
   var cb = new couchbase.Cluster(couchbaseserver);
   var myBucket = cb.openBucket(bucketfd);
   myBucket.remove(key,function(err) {
   if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
     console.log("Failed to remove data\n");
	 BlackloudLogger.log(logger, "info", "deleteData():Failed to remove data "+key);
	 result(err, null);
	 return;
   }
   result(err, null);
   myBucket.disconnect();
 });
}

exports.flushBucket = function flushBucket(result) {
 
   var cb = new couchbase.Cluster(couchbaseserver);
   var myBucket = cb.openBucket(bucketfd,'123456'); 
   console.log("start to flush data\n");
   var myBucketManager = myBucket.manager();
   if(myBucketManager)
   {
   	myBucketManager.flush(function(err,data){
   	});
   }else
	   console.log("myBucketManager == null\n");
}

exports.getBucket = function getBucket() {
  return myBucket;
}

exports.disconnect = function disconnect() {
   console.log("Buckets disconnect\n");
   var cb = new couchbase.Cluster(couchbaseserver);
   var myBucket = cb.openBucket(bucketfd);
   myBucket.disconnect();
}


exports.setBillingView = function setBillingView() {

 //create a new view
 var baseview = require('baseview')({url: c_couchbase,bucket: bucketfd});
 baseview.setDesign('user_id', {
  'user_id': {
   'map': "function (doc, meta) { if(!doc.Trial) {emit(meta.id, null);}}"
  }
 }, function(err, res) {
  if (err != null) console.log(err);
 });
}

exports.setWeatherView = function setWeatherView() {

 //create a new view
 var baseview = require('baseview')({url: c_couchbase,bucket: bucketfd});
 baseview.setDesign('design_weather', {
  'basic_zip': {
   'map': "function (doc, meta) { if(doc.data.current_condition && doc.data.weather) {emit(meta.id,null);}}"
  }
 }, function(err, res) {
  if (err != null) console.log(err);
 });
}
