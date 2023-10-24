/**
 * Simple wrapper to mimick Socket class from NET package, since TLS package has slightly different API.
 * We implement several methods that TCP sockets are expected to have. We will proxy call them as soon as
 * real TLS socket will be created (TLS socket created after connection).
 */
class TlsSocketWrapper {
	constructor(tls) {
		this._tls = tls; // dependency injection lol
		this._socket = false;
		// defaults:
		this._timeout = 5000;
		this._encoding = 'utf8';
		this._keepAliveEneblad = true;
		this._keepAliveinitialDelay = 0;
		this._noDelay = true;
		this._listeners = {};
	}

	setTimeout(timeout) {
		if (this._socket) this._socket.setTimeout(timeout);
		this._timeout = timeout;
	}

	setEncoding(encoding) {
		if (this._socket) this._socket.setEncoding(encoding);
		this._encoding = encoding;
	}

	setKeepAlive(enabled, initialDelay) {
		if (this._socket) this._socket.setKeepAlive(enabled, initialDelay);
		this._keepAliveEneblad = enabled;
		this._keepAliveinitialDelay = initialDelay;
	}

	setNoDelay(noDelay) {
		if (this._socket) this._socket.setNoDelay(noDelay);
		this._noDelay = noDelay;
	}

	on(event, listener) {
		this._listeners[event] = this._listeners[event] || [];
		this._listeners[event].push(listener);
	}

	removeListener(event, listener) {
		this._listeners[event] = this._listeners[event] || [];
		let newListeners = [];

		let found = false;
		for (let savedListener of this._listeners[event]) {
			if (savedListener == listener) {
				// found our listener
				found = true;
				// we just skip it
			} else {
				// other listeners should go back to original array
				newListeners.push(savedListener);
			}
		}

		if (found) {
			this._listeners[event] = newListeners;
		} else {
			// something went wrong, lets just cleanup all listeners
			this._listeners[event] = [];
		}
	}

	connect(port, host, callback) {
		// resulting TLSSocket extends <net.Socket>
		this._socket = this._tls.connect({ port: port, host: host, rejectUnauthorized: false }, () => {
			return callback();
		});

		// setting everything that was set to this proxy class

		this._socket.setTimeout(this._timeout);
		this._socket.setEncoding(this._encoding);
		this._socket.setKeepAlive(this._keepAliveEneblad, this._keepAliveinitialDelay);
		this._socket.setNoDelay(this._noDelay);

		// resubscribing to events on newly created socket so we could proxy them to already established listeners

		this._socket.on('data', data => {
			this._passOnEvent('data', data);
		});
		this._socket.on('error', data => {
			this._passOnEvent('error', data);
		});
		this._socket.on('close', data => {
			this._passOnEvent('close', data);
		});
		this._socket.on('connect', data => {
			this._passOnEvent('connect', data);
		});
		this._socket.on('connection', data => {
			this._passOnEvent('connection', data);
		});
	}

	_passOnEvent(event, data) {
		this._listeners[event] = this._listeners[event] || [];
		for (let savedListener of this._listeners[event]) {
			savedListener(data);
		}
	}

	emit(event, data) {
		this._socket.emit(event, data);
	}

	end() {
		this._socket.end();
	}

	destroy() {
		this._socket.destroy();
	}

	write(data) {
		this._socket.write(data);
	}
}

module.exports = TlsSocketWrapper;
