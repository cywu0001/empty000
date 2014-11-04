var http = require("http");
var couchbase = require('couchbase');
var merge = require('merge');
var bucketfd = 'default';
var couchbaseserver = "54.68.203.148:8091";
var c_couchbase = 'http://54.68.203.148:8092';
var success = 0;

var response_data = {
	"status" :
	{
	"code": 1200,
	"message": "Command succeeded"
	},
};

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
			}else
			{
				console.log("Replace data success\n");
			}
			result(err, null);
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

exports.getZIP = function getZIP(result) {
  // retrieve data from a view
  var baseview = require('baseview')({url: c_couchbase,bucket: bucketfd});
  baseview.view('design_weather', 'basic_zip', function(error, data) {
    //console.log(error, data);
    result(error, data);
  });
 }

exports.getData = function getData(zip ,result) {
 
 // Insert the data in Couchbase using the add method ()
   var cb = new couchbase.Cluster(couchbaseserver);
   var myBucket = cb.openBucket(bucketfd);
   myBucket.get(zip,function(err,data) {
   if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
     console.log("Failed to get data\n");
	 result(err, null);
	 return;
   }
   var out_json = JSON.parse(data.value);
   response_data = merge(response_data,out_json);
    console.log("Get data:",JSON.stringify(response_data));
   result(err, JSON.stringify(response_data));
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

exports.test = function test(test,result) {
   var myTest = cb.openBucket('beer-sample');
   myTest.get(test,function(err,data) {
   if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
     console.log("Failed to insert data\n");
	 return;
   }
   result(err, data);
 });
}


exports.setView = function setView() {

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
