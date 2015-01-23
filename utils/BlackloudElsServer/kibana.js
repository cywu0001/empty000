var express      = require('express'),
	auth         = require('http-auth'),
	http         = require('http'),
	app          = express(),
	server       = http.createServer(app),
	port         = 10101;

var basicauth = auth.basic({
    realm: 'Gemtek',
    file: __dirname + '/accounts.config' // user account config file
});

app.use(auth.connect(basicauth));
app.use('/', express.static(__dirname + '/kibana-3.1.2'));
app.get('/logout', function (req, res) {
    res.statusCode = 401;
	res.end('Log out successfully!');
});
// runs kibana on specific port
server.listen(port, function(err) { 
	console.log('Kibana runs on port ' + port);
});

