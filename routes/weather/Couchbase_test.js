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
    	console.log(data);
	}
};

 var tmp = {
  "data": {
    "current_condition": [
      {
        "precipMM": "1.2",
        "temp_C": "13",
        "weatherCode": "176",
        "weatherDesc": [
          {
            "value": "Patchy rain nearby"
          }
        ]
      }
    ]
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

//var json = JSON.parse(JSON.stringify(status));
//console.log(emps);
//var out = objectMerge(status,tmp);
//var out = [];
//out.push(status);
//out.push(tmp);
//console.log(out);
//status = merge(status,tmp);
//console.log(status);
//couchbase.insertData('102',emps,result);
//couchbase.insertData('102',emps,result);
//couchbase.setView(); 
//couchbase.getZIP(result);
//couchbase.flushBucket(result);
couchbase.getData('1000',result);
/*
couchbase.getBucket().get('10001_current',function(err,data) {
if (err && err != 12) { // 12 : LCB_KEY_EEXISTS  
     console.log("Failed to get data\n");
	 console.log(data.value);
}else
     console.log("Successed to get data\n");
	 console.log(data.value);
});
*/

