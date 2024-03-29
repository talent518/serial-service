const serial = require("serialport");
if(process.argv.length < 3) {
	console.error('node ML307A.js <path>');
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
	path: process.argv[2],
	baudRate: 115200,
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

let next, text, isRaw = false;
serialPort.on('data', function(data) {
	if(!isRaw) console.log('<');
	process.stdout.write(data);
	if(next && data.includes(text)) {
		next();
		next = false;
	}
});

const send = function(cmd, txt) {
	return new Promise(function (resolve, reject) {
		if(isRaw) console.log(cmd);
		else console.log('> ' + cmd);
		text = txt;
		next = resolve;
		serialPort.write(cmd, function(e) {
			if(e) {
				text = '';
				next = false;
				reject(e);
			} else if(!txt) {
				text = '';
				next = false;
				resolve(true);
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

const run = async() => {
	//await send('+MATREADY\r', '+MATREADY');
	//await send('AT+CPIN?\r', 'OK');
	//await send('AT+CFUN?\r', 'OK');
	//await send('AT+CEREG?\r', 'OK');
	//await send('AT+CGDCONT=1,"IP","cmnet"\r', 'OK');
	//await send('AT+MIPCALL=1,1\r', 'OK');
	await send('AT+MIPOPEN=0,"TCP","www.baidu.com",80\r', '+MIPOPEN');
	await send('AT+MIPMODE=0,1\r', 'CONNECT');
	isRaw = true;
	console.log('---Request begin---');
	await send('GET / HTTP/1.1\r\nHost: www.baidu.com\r\nUser-Agent: curl/8.0.1\r\nAccept: */*\r\n\r\n', '</html>');
	console.log('---Request end---');
	isRaw = false;
	await send('+++', 'OK');
	await send('AT+MIPSACK=0\r', 'OK');
	await send('AT+MIPCLOSE=0,1\r', 'MIPCLOSE');
	console.log('---Completed---');
};
