var fs = require('fs');
var winstond = require('winstond');
var dotenv = require('dotenv');

dotenv.load();

var projectAmount = process.env.PROJECT_AMOUNT;
var projectName = '';
var port;

startLogServer();

function startLogServer() {
	for(var i=1 ; i<=projectAmount ; i++)
	{
		projectName = process.env['PROJECT_NAME_'+i];
		port = process.env['SERVER_PORT_'+i];
	
		checkDirExist(projectName);
		var server = winstond.nssocket.createServer({
			services: ['collect', 'query', 'stream'],
//			host: '10.70.1.213',
			port: port
		});
	
		server.add(winstond.transports.DailyRotateFile, {
			name: 'file',
			filename: __dirname + '/log/' + projectName + '/debug.log',
			datePattern: '.yyyy-MM-dd',  
			timestamp: function() { 
				return getTimeStamp();
			},
		});

		//server.add(winstond.transports.Console, {});
		server.listen();
		console.log('Blackloud Logger Server of ' + projectName + ' started! Listen on port ' + port);
	}
}

function getTimeStamp() {
	var date = new Date();
	var timeString = date.toLocaleTimeString();
	var timeStamp = timeString;

	return timeStamp;
}

/*
 * --------------------------------------------------------
 * Setup server log directory (Create if not exist)
 * --------------------------------------------------------
 */
function checkDirExist(projectName){
    if(!fs.existsSync('log')){
      console.log("Log folder not exist, create it.\n");
      fs.mkdirSync('log', 0775, function(err){
        if(err){
          console.log("Log folder create failure.\n");
        }
      });
    }
    if(!fs.existsSync('log/' + projectName)){
      console.log(projectName + " folder not exist, create it.\n");
      fs.mkdirSync('log/' + projectName, 0775, function(err){
        if(err){
          console.log(pid +" folder create failure.\n");
        }
      });
    }
}


