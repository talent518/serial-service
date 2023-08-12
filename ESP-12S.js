const serial = require('serialport');
const args = require('minimist')(process.argv.slice(2));
const config = {
	path: '',
	baudRate: 115200,
	wifi: '',
	pass: '',
};

if(args.rate) config.baudRate = parseInt(args.rate);
if(args.port) config.port = parseInt(args.port);

if(args.path) config.path = args.path;
if(args.wifi) config.wifi = args.wifi;
if(args.pass) config.pass = args.pass;
if(!config.path) {
	console.log('Usage: node server.js --path=<path> [--rate=<baudRate>] [--wifi=name] [--pass=password]');
	console.log('Configuration of default value:');
	console.log('  baudRate: ' + config.baudRate);
	console.log('       wifi: ' + config.wifi);
	console.log('       pass: ' + config.pass);
	serial.SerialPort.list().then(ports=>{
		console.log(ports.filter(p=>{return (p.manufacturer || p.productId);}));
		process.exit();
	}).catch(e=>{
		console.error(e);
		process.exit();
	});
	return;
}

const serialPort = new serial.SerialPort({
	path: config.path,
	baudRate: config.baudRate,
	autoOpen: false
});

serialPort.open(function(e) {
	if(e) {
		console.log('failure', e);
	} else {
		console.log('success');
	}
	console.log('');

	run().then(function(r) {
		if(r !== undefined) console.log(r);
		process.exit();
	}).catch(function(e) {
		console.error(e);
		process.exit();
	});
});

let cbOK, cbERR, resOK, resERR;
serialPort.on('data', function(data) {
	process.stdout.write(data);
	if(cbOK && data.includes(resOK)) {
		cbOK();
		cbOK = cbERR = resOK = resERR = false;
	}
	if(cbERR && data.includes(resERR)) {
		cbERR();
		cbOK = cbERR = resOK = resERR = false;
	}
});

const send = function(cmd, txtOK, txtERR) {
	const err = new Error('AT命令错误');
	
	return new Promise(function (resolve, reject) {
		resOK = txtOK;
		resERR = txtERR;
		cbOK = resolve;
		cbERR = () => reject(err);
		serialPort.write(cmd, function(e) {
			if(e) {
				cbOK = cbERR = resOK = resERR = false;
				reject(e);
			}
		});
	});
};

const usleep = function(t) {
	return new Promise(function (resolve, reject) {
		setTimeout(function() {
			resolve(true);
		}, t);
	});
};

const HTTP_REQ = 'GET / HTTP/1.1\r\nHost: www.baidu.com\r\nUser-Agent: curl/8.0.1\r\nAccept: */*\r\n\r\n';

const run = async() => {
	if(config.wifi && config.pass) {
		await send('AT+CWMODE=1\r\n', '\r\nOK\r\n', '\r\nERROR\r\n');
		await send('AT+CWJAP_DEF="' + config.wifi + '","' + config.pass + '"\r\n', '\r\nOK\r\n', '\r\nERROR\r\n');
	} else {
		await send('AT+CWMODE?\r\n', '\r\nOK\r\n', '\r\nERROR\r\n');
		await send('AT+CWJAP_CUR?\r\n', '\r\nOK\r\n', '\r\nERROR\r\n');
		await send('AT+CWJAP_DEF?\r\n', '\r\nOK\r\n', '\r\nERROR\r\n');
	}
	
	await send('AT+CIFSR\r\n', '\r\nOK\r\n', '\r\nERROR\r\n');

	await send('AT+CIPMUX=0\r\n', '\r\nOK\r\n', '\r\nERROR\r\n');
	await send('AT+CIPSTART="TCP","180.101.50.242",80\r\n', '\r\nOK\r\n', '\r\nERROR\r\n');
	
	await send('AT+CIPSEND=' + HTTP_REQ.length + '\r\n', 'OK\r\n> ', '\r\nERROR\r\n');
	await send(HTTP_REQ, '</html>', '\r\nERROR\r\n');

	await send('AT+CIPCLOSE\r\n', '\r\nOK\r\n', '\r\nERROR\r\n');
};

