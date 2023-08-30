const serial = require('serialport');
const args = require('minimist')(process.argv.slice(2));
const net = require('net');
const conns = [];
const config = {
	path: '',
	baudRate: 115200,
	port: 3888,
	sndHex: false,
	rcvHex: false,
	json: false,
};

if(args.rate) config.baudRate = parseInt(args.rate);
if(args.port) config.port = parseInt(args.port);
if(args.sndHex) config.sndHex = !config.sndHex;
if(args.rcvHex) config.rcvHex = !config.rcvHex;
if(args.json) config.json = !config.json;

if(args.path) config.path = args.path;
else {
	console.log('Usage: node server.js --path=<path> [--rate=<baudRate>] [--port=<port>] [--sndHex] [--rcvHex] [--json]');
	console.log('Configuration of default value:');
	console.log('  baudRate: ' + config.baudRate);
	console.log('  port: ' + config.port);
	console.log('  sndHex: ' + config.sndHex);
	console.log('  rcvHex: ' + config.rcvHex);
	console.log('  json: ' + config.json);
	serial.SerialPort.list().then(ports=>{
		console.log(ports.filter(p=>{return (p.manufacturer || p.productId);}));
		process.exit();
	}).catch(e=>{
		console.error(e);
		process.exit();
	});
	return;
}

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
	path: config.path,
	baudRate: config.baudRate,
	autoOpen: false
});

serialPort.open(function(e) {
	if(e) {
		console.log('open serial '  + config.path + ' failure', e);
	} else {
		console.log('open serial '  + config.path + ' success');
	}
	console.log('');
});

let buf, timer;
serialPort.on('data', function(data) {
	if(config.json) {
		if(buf) {
			data = Buffer.concat([buf, data]);
			buf = null;
		}

		try {
			console.log(JSON.parse(data.toString()));
			clearTimeout(timer);
		} catch(e) {
			buf = data;
			timer = setTimeout(function() {
				if(!buf) return;

				process.stdout.write(buf);
				buf = null;
			}, 100);
		}
	} else if(config.rcvHex) console.log(data.toString('hex'));
	else process.stdout.write(data);

	conns.forEach(function(conn, i) {
		conn.write(data);
	});
});

serialPort.on('error', function(e) {
	console.error(e);
	process.exit();
});

serialPort.on('close', function() {
	process.exit();
});

process.stdin.on('data', function(data) {
	serialPort.write(config.sndHex ? Buffer.from(data, 'hex') : data.toString().trim() + '\r\n', function(e) {
		if(e) console.error(e);
	});
});

server.listen(config.port, function() {
	console.log('Serial Service listen port is ' + config.port);
});

process.on('uncaughtException', function (e) {
	console.error(e);
	process.exit();
});
