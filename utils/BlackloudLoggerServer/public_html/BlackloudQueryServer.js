
var http = require('http');
var express = require('express');
var fs = require('fs');
var bodyparser = require('body-parser');
var app = express();
var server = http.createServer(app);
var blackloudlogquery = require('../BlackloudLogQuery');
var dotenv = require('dotenv');

dotenv.load();

/*
 * --------------------------------------------------------
 * Setup server log directory (Create if not exist)
 * --------------------------------------------------------
 */
/*
function checkDirExist(pid, callback){
	var logDir = '../log'
    if(!fs.existsSync(logDir)){
      console.log("Log folder not exist, create it.\n");
      fs.mkdirSync(logDir, 0775, function(err){
        if(err){
          console.log("Log folder create failure.\n");
        }
      });
    }
    if(!fs.existsSync(logDir + '/' + pid)){
      console.log(pid + " folder not exist, create it.\n");
      fs.mkdirSync(logDir + '/' + pid, 0775, function(err){
        if(err){
          console.log(pid +" folder create failure.\n");
        }
      });
    }
	callback();
}
*/
app.use('/css', express.static(__dirname + '/css'));
app.use('/js', express.static(__dirname + '/js'));
app.use('/img', express.static(__dirname + '/img'));
app.use('/LogQuery', express.static(__dirname + '/query.html'));
app.use(bodyparser.json());

app.get('/', function(req, res){
	res.send('Blackloud Log Query!');
});

app.post('/StartLogQuery', function(req, res){
	
	var paramList = req.body;
	console.log('params = ' + paramList);
	console.log(paramList.type);
	console.log(paramList.sdate);
	console.log(paramList.edate);
	console.log(paramList.project);
	console.log(paramList.label);
	console.log(paramList.level);
	console.log(paramList.stime);
	console.log(paramList.etime);

	// Check if the log directory is well prepared
	// to prevent runtime error when querying
	blackloudlogquery.query(paramList, function(resultList) {
		res.send(resultList);
	});
});

//server.listen(8080, process.env.server_ip, function(){
server.listen(9090, function(){
	console.log('Server started on port 9090');
});

