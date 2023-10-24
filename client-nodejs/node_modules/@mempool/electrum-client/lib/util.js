'use strict';

const makeRequest = (exports.makeRequest = (method, params, id) => {
	return JSON.stringify({
		jsonrpc: '2.0',
		method: method,
		params: params,
		id: id,
	});
});

const createRecuesiveParser = (exports.createRecuesiveParser = (max_depth, delimiter) => {
	const MAX_DEPTH = max_depth;
	const DELIMITER = delimiter;
	const recursiveParser = (n, buffer, callback) => {
		if (buffer.length === 0) {
			return { code: 0, buffer: buffer };
		}
		if (n > MAX_DEPTH) {
			return { code: 1, buffer: buffer };
		}
		const xs = buffer.split(DELIMITER);
		if (xs.length === 1) {
			return { code: 0, buffer: buffer };
		}
		callback(xs.shift(), n);
		return recursiveParser(n + 1, xs.join(DELIMITER), callback);
	};
	return recursiveParser;
});

const createPromiseResult = (exports.createPromiseResult = (resolve, reject) => {
	return (err, result) => {
		if (err) reject(err);
		else resolve(result);
	};
});

const createPromiseResultBatch = (exports.createPromiseResultBatch = (resolve, reject, argz) => {
	return (err, result) => {
		if (result && result[0] && result[0].id) {
			// this is a batch request response
			for (let r of result) {
				r.param = argz[r.id];
			}
		}
		if (err) reject(err);
		else resolve(result);
	};
});

class MessageParser {
	constructor(callback) {
		this.buffer = '';
		this.callback = callback;
		this.recursiveParser = createRecuesiveParser(20, '\n');
	}
	run(chunk) {
		this.buffer += chunk;
		while (true) {
			const res = this.recursiveParser(0, this.buffer, this.callback);
			this.buffer = res.buffer;
			if (res.code === 0) {
				break;
			}
		}
	}
}
exports.MessageParser = MessageParser;
