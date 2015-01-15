var express      = require('express'),
	auth         = require('basic-auth'),
	http         = require('http'),
	app          = express(),
	server       = http.createServer(app);
	userAccounts = require('./userAccount'),
	port         = 10101;

function checkUser(user, accounts) {
	var pass = false;
	accounts.forEach(function(entry) {
		if( user['name'] === entry.username && user['pass'] === entry.password )
		{
			pass = true;
			return;
		}	
	});
	return pass;
}

app.use(function(req, res, next) {
    var user = auth(req);

	if( user === undefined || !checkUser(user, userAccounts.accounts) )
	{
	    res.statusCode = 401;
        res.setHeader('WWW-Authenticate', 'Basic realm="Gemtek"');
        res.end('Unauthorized');
	}
	else
		next();
});

app.use('/', express.static(__dirname + '/kibana-3.1.2'));
app.get('/logout', function (req, res) {
    res.statusCode = 401;
	res.end('Log out successfully!');
});

// runs kibana on specific port
//app.listen(port, function(err) { 
server.listen(port, function(err) { 
	console.log('Kibana runs on port ' + port);
});

