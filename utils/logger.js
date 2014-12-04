var fs = require('fs');
var dotenv = require('dotenv');
var winston = require('winston');
//var log2s3 = require('./BlackloudLog2S3');

winston.add(require('winston-nssocket').Nssocket, {
  host: '10.70.1.213',
  port: 8081
});

setTimeout(function() { 
	winston.log('info', 'Hello world!1', { foo: 'bar' }) 
	winston.log('info', 'Hello world!2', { foo: 'bar' }) 
	winston.log('info', 'Hello world!3', { foo: 'bar' }) 
	winston.log('info', 'Hello world!4', { foo: 'bar' }) 
	winston.log('info', 'Hello world!5', { foo: 'bar' }) 
	winston.log('info', 'Hello world!6', { foo: 'bar' }) 
	winston.log('info', 'Hello world!7', { foo: 'bar' }) 
	winston.log('info', 'Hello world!8', { foo: 'bar' }) 
}, 1000);

setTimeout(function() { 
	winston.log('info', 'Hello world!1', { foo: 'bar' }) 
	winston.log('info', 'Hello world!2', { foo: 'bar' }) 
	winston.log('info', 'Hello world!3', { foo: 'bar' }) 
	winston.log('info', 'Hello world!4', { foo: 'bar' }) 
	winston.log('info', 'Hello world!5', { foo: 'bar' }) 
	winston.log('info', 'Hello world!6', { foo: 'bar' }) 
	winston.log('info', 'Hello world!7', { foo: 'bar' }) 
	winston.log('info', 'Hello world!8', { foo: 'bar' }) 
}, 1500);

setTimeout(function() { 
	winston.log('info', 'Hello world!1', { foo: 'bar' }) 
	winston.log('info', 'Hello world!2', { foo: 'bar' }) 
	winston.log('info', 'Hello world!3', { foo: 'bar' }) 
	winston.log('info', 'Hello world!4', { foo: 'bar' }) 
	winston.log('info', 'Hello world!5', { foo: 'bar' }) 
	winston.log('info', 'Hello world!6', { foo: 'bar' }) 
	winston.log('info', 'Hello world!7', { foo: 'bar' }) 
	winston.log('info', 'Hello world!8', { foo: 'bar' }) 
}, 2000);

setTimeout(function() { 
	winston.log('info', 'Hello world!1', { foo: 'bar' }) 
	winston.log('info', 'Hello world!2', { foo: 'bar' }) 
	winston.log('info', 'Hello world!3', { foo: 'bar' }) 
	winston.log('info', 'Hello world!4', { foo: 'bar' }) 
	winston.log('info', 'Hello world!5', { foo: 'bar' }) 
	winston.log('info', 'Hello world!6', { foo: 'bar' }) 
	winston.log('info', 'Hello world!7', { foo: 'bar' }) 
	winston.log('info', 'Hello world!8', { foo: 'bar' }) 
}, 2500);

setTimeout(function() { 
	winston.log('info', 'Hello world!1', { foo: 'bar' }) 
	winston.log('info', 'Hello world!2', { foo: 'bar' }) 
	winston.log('info', 'Hello world!3', { foo: 'bar' }) 
	winston.log('info', 'Hello world!4', { foo: 'bar' }) 
	winston.log('info', 'Hello world!5', { foo: 'bar' }) 
	winston.log('info', 'Hello world!6', { foo: 'bar' }) 
	winston.log('info', 'Hello world!7', { foo: 'bar' }) 
	winston.log('info', 'Hello world!8', { foo: 'bar' }) 
}, 3000);

setTimeout(function() { 
	winston.log('info', 'Hello world!1', { foo: 'bar' }) 
	winston.log('info', 'Hello world!2', { foo: 'bar' }) 
	winston.log('info', 'Hello world!3', { foo: 'bar' }) 
	winston.log('info', 'Hello world!4', { foo: 'bar' }) 
	winston.log('info', 'Hello world!5', { foo: 'bar' }) 
	winston.log('info', 'Hello world!6', { foo: 'bar' }) 
	winston.log('info', 'Hello world!7', { foo: 'bar' }) 
	winston.log('info', 'Hello world!8', { foo: 'bar' }) 
}, 3500);

setTimeout(function() { 
	winston.log('info', 'Hello world!1', { foo: 'bar' }) 
	winston.log('info', 'Hello world!2', { foo: 'bar' }) 
	winston.log('info', 'Hello world!3', { foo: 'bar' }) 
	winston.log('info', 'Hello world!4', { foo: 'bar' }) 
	winston.log('info', 'Hello world!5', { foo: 'bar' }) 
	winston.log('info', 'Hello world!6', { foo: 'bar' }) 
	winston.log('info', 'Hello world!7', { foo: 'bar' }) 
	winston.log('info', 'Hello world!8', { foo: 'bar' }) 
}, 4000);

setTimeout(function() { 
	winston.log('info', 'Hello world!1', { foo: 'bar' }) 
	winston.log('info', 'Hello world!2', { foo: 'bar' }) 
	winston.log('info', 'Hello world!3', { foo: 'bar' }) 
	winston.log('info', 'Hello world!4', { foo: 'bar' }) 
	winston.log('info', 'Hello world!5', { foo: 'bar' }) 
	winston.log('info', 'Hello world!6', { foo: 'bar' }) 
	winston.log('info', 'Hello world!7', { foo: 'bar' }) 
	winston.log('info', 'Hello world!8', { foo: 'bar' }) 
}, 4500);
