var fs = require('fs');

var options = {
	key: fs.readFileSync(__dirname + "/ssl/ssl.key"),
	cert: fs.readFileSync(__dirname + "/ssl/ssl.cert"),
	ca:[fs.readFileSync(__dirname + "/ssl/ca.pem")],
	requestCert: true,
	rejectUnauthorized: false,
};

//ssl object
var ssl = {};

ssl.options = options;

module.exports = ssl;
