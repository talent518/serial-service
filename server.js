const serial = require('serialport');
const args = require('minimist')(process.argv.slice(2));
const net = require('net');
const conns = [];
const config = {
	path: '',
	baudRate: 115200,
	port: 0,
	sndHex: false,
	rcvHex: false,
	json: false,
	raw: false,
	rawMode: false,
};

if(args.rate) config.baudRate = parseInt(args.rate);
if(args.port) config.port = parseInt(args.port);
if(args.sndHex) config.sndHex = !config.sndHex;
if(args.rcvHex) config.rcvHex = !config.rcvHex;
if(args.json) config.json = !config.json;
if(args.raw) config.raw = !config.raw;
if(args.rawMode) config.rawMode = !config.rawMode;

if(args.path) config.path = args.path;
else {
	console.log('Usage: node server.js --path=<path> [--rate=<baudRate>] [--port=<port>] [--sndHex] [--rcvHex] [--json] [--raw] [--rawMode]');
	console.log('Configuration of default value:');
	console.log('  baudRate: ' + config.baudRate);
	console.log('  port: ' + config.port);
	console.log('  sndHex: ' + config.sndHex);
	console.log('  rcvHex: ' + config.rcvHex);
	console.log('  json: ' + config.json);
	console.log('  raw: ' + config.raw);
	console.log('  rawMode: ' + config.rawMode);
	serial.SerialPort.list().then(ports=>{
		const os = require('os');
		const force = !os.machine().startsWith('x86');
		console.log(ports.filter(p=>{return (force || p.manufacturer || p.productId);}));
		process.exit();
	}).catch(e=>{
		console.error(e);
		process.exit();
	});
	return;
}

Object.defineProperty(Number.prototype, 'toHexString', {
	enumerable: false,
	value: function(len, fill='0') {
		return this.toString(16).toUpperCase().padStart(len, fill);
	},
});

Object.defineProperty(Buffer.prototype, 'toHexString', {
	enumerable: false,
	value: function(sz = 2, separator = ' ') {
		const list = [];
		let i;
		for(i = 0; i < this.length; i++) {
			list.push(this.readUint8(i).toHexString(sz));
		}
		return list.join(separator);
	},
});

Object.defineProperty(Buffer.prototype, 'toArray', {
	enumerable: false,
	value: function(n) {
		const rets = [];
		let i;
		for(i = 0; i < this.length; i++) {
			rets.push(this.readUint8(i));
		}
		return rets;
	},
});

const server = net.createServer(function(conn) {
	conns.push(conn);
	conn.on('data', function(data) {
		if(config.sndHex) console.log('TX:', data.toHexString(2));
		else process.stdout.write(data);

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
		process.exit();
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

		let pos, line;
		while(data) {
			pos = data.indexOf('\r\n');
			if(pos > -1) {
				line = data.subarray(0, pos).toString();
				pos += 2;
				if(pos < data.length) {
					data = data.subarray(pos);
				} else {
					data = null;
				}

				try {
					console.log(JSON.parse(line));
				} catch(e) {
					console.log(line);
				}
			} else {
				buf = data;
				break;
			}
		}
	} else if(config.rcvHex) console.log('RX:', data.toHexString(2));
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

if(config.rawMode) process.stdin.setRawMode(true);
process.stdin.on('data', function(data) {
	if(config.sndHex) {
		data = data.toString().trim();
		if(/^([0-9a-fA-F]{2})+$/.test(data)) {
			data = Buffer.from(data, 'hex');
		} else {
			const hexs = [];
			data.split(/[^0-9a-fA-F]+/).forEach(function(chr) {
				chr = parseInt(chr, 16);
				if(!isNaN(chr) && chr >= 0 && chr < 256) {
					hexs.push(chr.toHexString(2));
				}
			});
			data = Buffer.from(hexs.join(''), 'hex');
		}
		serialPort.write(data, function(e) {
			if(e) console.error(e);
			else console.log('TX:', data.toHexString(2));
		});
	} else {
		serialPort.write(config.raw ? data : data.toString().trim() + '\r\n', function(e) {
			if(e) console.error(e);
		});
	}
});

if(config.port) {
	server.listen(config.port, '0.0.0.0', function() {
		console.log('Serial Service listen port is ' + config.port);
	});
}

process.on('uncaughtException', function (e) {
	console.error(e);
	process.exit();
});
