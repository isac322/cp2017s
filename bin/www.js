#!/usr/bin/env node

"use strict";

/**
 * Module dependencies.
 */

const server = require('../app');
const debug = require('debug')('cp2017s:server');
const https = require('https');
const fs = require('fs');

const options = {
	key: fs.readFileSync('privkey.pem'),
	cert: fs.readFileSync('fullchain.pem'),
	ca: fs.readFileSync('chain.pem')
};


/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || '443');
const app = server.Server.bootstrap().app;
app.set('port', port);

/**
 * Create HTTP server.
 */
const httpsServer = https.createServer(options, app);

/**
 * Listen on provided port, on all network interfaces.
 */

httpsServer.listen(port);
httpsServer.on('error', onError);
httpsServer.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
	const port = parseInt(val, 10);

	if (isNaN(port)) {
		// named pipe
		return val;
	}

	if (port >= 0) {
		// port number
		return port;
	}

	return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
	if (error.syscall !== 'listen') {
		throw error;
	}

	const bind = typeof port === 'string'
		? 'Pipe ' + port
		: 'Port ' + port;

	// handle specific listen errors with friendly messages
	switch (error.code) {
		case 'EACCES':
			console.error(bind + ' requires elevated privileges');
			process.exit(1);
			break;
		case 'EADDRINUSE':
			console.error(bind + ' is already in use');
			process.exit(1);
			break;
		default:
			throw error;
	}
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
	let addr = httpsServer.address();
	const bind = typeof addr === 'string'
		? 'pipe ' + addr
		: 'port ' + addr.port;
	debug('Listening on ' + bind);
}
