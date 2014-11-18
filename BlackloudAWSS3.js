/* ========================================================= */
//                                        BlackloudAWSS3 API
//                                        ---------------------
// Feature:
//         AWS service.
//
// Usage:
//         1. npm install
//         2. require('./BlackloudAWSS3') in your code
//
// APIs:
//         - (BlackloudAWSS3.request).listBucket()
//                 -> List all Buckets.
//         - (BlackloudAWSS3.request).createBucket( BucketName)
//                 -> Create "BucketName" Bucket.
//         - (BlackloudAWSS3.request).deleteBucket( BucketName)
//                 -> Delete "BucketName" Bucket.
//         - (BlackloudAWSS3.request).listObj( BucketName)
//                 -> List all Objects of "BucketName" Bucket.
//         - (BlackloudAWSS3.request).putObj( BucketName, ObjName)
//                 -> put "ObjName" file (or folder named by "/" in the end) to "BucketName" Bucket.
//         - (BlackloudAWSS3.request).getObj( BucketName, ObjName)
//                 ->get "ObjName" file from "BucketName" Bucket.
//         - (BlackloudAWSS3.request).deleteObj( BucketName, ObjName)
//                 -> Delete "ObjName" file from "BucketName" Bucket.
// Sample:
//
// var blackloud = require('./BlackloudAWSS3');
//
// blackloud.listBucket();
// blackloud.deleteBucket("Owen_test");
// blackloud.putObj("Owen_test", "test.txt");


/* ========================================================= */


//module.exports = blackloud;
var AWS = require('aws-sdk');
var fs = require('fs');

//Blackloud API

module.exports = {

listBucket : function ()
{
	var s3 = new AWS.S3();
	s3.listBuckets
	(
		function(err, data) 
		{
  			if (err) console.log(err, err.stack); // an error occurred
  			else     console.log(data);           // successful response
		}
	);
	s3 = null;
	delete s3;
},

createBucket : function( bucketname )
{
	var s3 = new AWS.S3();	
	s3.createBucket
	(
		{Bucket : bucketname},
		function(err, data) 
		{
  			if (err) console.log(err, err.stack); 				// an error occurred
  			else     console.log("create "+bucketname+" Success!!!");       // successful response
		}
	);
	s3 = null;
        delete s3;
},

deleteBucket : function( bucketname )
{
	var s3 = new AWS.S3();
	
	s3.deleteBucket
	(
		{Bucket : bucketname}, 
		function(err, data) 
		{
  			if (err) console.log(err, err.stack); 				// an error occurred
  			else     console.log("delete "+bucketname+" Success!!!");       // successful response
		}
	);
	s3 = null;
        delete s3;
},

listObj: function ( bucketname )
{
	var s3 = new AWS.S3();
	s3.listObjects
	(
		{Bucket : bucketname}, 
		function(err, data) 
		{
  			if (err) console.log(err, err.stack); // an error occurred
  			else     console.log(data);           // successful response
		}
	);
	s3 = null;
        delete s3;
},

putObj: function( bucketname, objname)
{
	var s3 = new AWS.S3();
	
	s3.putObject
	(
		{ Bucket:bucketname, Key:objname, Body:fs.readFileSync(objname) }, 
		function(err, data) 
		{
  			if (err) console.log(err, err.stack); // an error occurred
  			else     console.log("Put "+objname+" success!!!");           // successful response
		}
	);
	s3 = null;
        delete s3;
},

getObj: function( bucketname, objname)
{
	var s3 = new AWS.S3();

	var filePath = fs.createWriteStream(objname);

	s3.getObject({ Bucket:bucketname, Key:objname}).
	on('httpData', function(chunk) { filePath.write(chunk); }).
	on('httpDone', function() { filePath.end(); }).
	send(
		function(err,data)
		{
			if (err) console.log("Get "+objname+" fail!!!"/*err, err.stack*/); // an error occurred
                        else     console.log("Get "+objname+" success!!!");});
	s3 = null;
        delete s3;
},

deleteObj: function(bucketname, objname)
{
        var s3 = new AWS.S3();
        s3.deleteObject
        (
                { Bucket:bucketname, Key:objname },
                function(err, data)
                {
                        if (err) console.log(err, err.stack); // an error occurred
                        else     console.log("Delete "+objname+" success!!!");           // successful response
                }
        );
        s3 = null;
        delete s3;
}

}
