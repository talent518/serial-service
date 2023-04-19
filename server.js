const serial = require("serialport");
const fs = require('fs');
const net = require('net');
const iconv = require('iconv-lite');
const config = require('./config');
const conns = [];
const server = net.createServer(function(conn) {
	conns.push(conn);
	conn.on('data', function(data) {
		serialPort.write(data, function(e) {
			if(e) console.error(e);
		});
	});
	conn.on('close', function() {
		conns.splice(conns.indexOf(conn), 1);
	});
});
const serialPort = new serial.SerialPort({
	path: config.com,
	baudRate: config.baudRate,
	autoOpen: false
});

serialPort.open(function(e) {
	if(e) {
		console.log('open serial '  + config.com + ' failure', e);
	} else {
		console.log('open serial '  + config.com + ' success');
	}
	console.log('');
});

serialPort.on('data', function(data) {
	console.log('<', data.toString());
	// process.stdout.write(data);
	conns.forEach(function(conn, i) {
		conn.write(data);
	});
});

serialPort.on('close', function() {
	process.exit();
});

process.stdin.on('data', function(data) {
	serialPort.write(data/*.toString().trim()+'\n'*/, function(e) {
		if(e) console.error(e);
		else console.log('>', data.toString());
	});
});

server.listen(config.port, function() {
	console.log('Serial Service listen port is ' + config.port);
});

process.on('uncaughtException', function (e) {
	console.error(e);
});
