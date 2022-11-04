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
	process.stdout.write(data);
	conns.forEach(function(conn, i) {
		conn.write(data);
	});
});

process.stdin.on('data', function(data) {
	serialPort.write(data, function(e) {
		if(e) console.error(e);
	});
});

server.listen(config.port, function() {
	console.log('Serial Service listen port is ' + config.port);
});

//≤∂ªÒ“Ï≥££¨∑¿÷π±¿¿£
process.on('uncaughtException', function (e) {
	console.error(e);
});
