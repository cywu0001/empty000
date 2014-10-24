
var log2s3 = require('./BlackloudLogUpdate'); 
var UPDATE_INTERVAL = 1000 * 60 * 60 * 12; // 12hr -> ms
//var UPDATE_INTERVAL = 1000 * 5; // 12hr -> ms

// Do once when first calling this service.
// or it should wait for a long time to get launched.
console.log('Update at service start!');
log2s3.update();
// Auto update every 12 hr
var tick = setInterval(log2s3.update, UPDATE_INTERVAL);


