var couchbase = require("./Couchbase");
var merge = require('merge');

var result = function (err, data) {
	console.log("callback function:result\n");
    if (err)
	{ 
		console.log("get some error:\n",err);
	}
	if(data)
	{
 		console.log("data:"+JSON.stringify(data));
	}
};


var status = {
	"status":
	{
	  "code":200,
	  "message":"completed"
	}
};

 var emps = {
  "id": "100",
  "type": "employee",
  "name": "AAAA",
  "dept": "HW",
  "salary": 5000
 };


//couchbase.insertData('102',emps,result);

//couchbase.setWeatherView(); 
//couchbase.getZIP(result);
//couchbase.flushBucket(result);
//couchbase.getData('abc_Purchased_Product',result);


//couchbase.setBillingView(); 
//couchbase.getUser_ID(result);

/*
var parameterObj;
parameterObj = {
	user_ID : "Will",
	device_ID : "2222",
	product_ID : "3333",
	start_Date : "2014/12/12",
	end_Date : "2014/12/31",
	store : ""
};

couchbase.insertHistoryData(parameterObj,result);
*/
/*
var parameterObj;
parameterObj = {
	user_ID : "Will",
	device_ID : "2222",
	product_ID : "1111",
	start_Date : "2014/12/12",
	end_Date : "2015/1/31",
	store : "",
	receipt_data : "qwertyuiop",
	package_name : "com.test.testsample"
};

couchbase.insertPurchasedData(parameterObj,result);
*/

