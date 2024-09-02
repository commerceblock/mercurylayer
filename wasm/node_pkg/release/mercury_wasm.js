let imports = {};
imports['__wbindgen_placeholder__'] = module.exports;
let wasm;
const { TextEncoder, TextDecoder } = require(`util`);

const heap = new Array(128).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let heap_next = heap.length;

function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let WASM_VECTOR_LEN = 0;

let cachedUint8Memory0 = null;

function getUint8Memory0() {
    if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
}

let cachedTextEncoder = new TextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

let cachedInt32Memory0 = null;

function getInt32Memory0() {
    if (cachedInt32Memory0 === null || cachedInt32Memory0.byteLength === 0) {
        cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

let cachedFloat64Memory0 = null;

function getFloat64Memory0() {
    if (cachedFloat64Memory0 === null || cachedFloat64Memory0.byteLength === 0) {
        cachedFloat64Memory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64Memory0;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}
/**
* @param {any} config_json
* @param {any} wallet_json
* @returns {any}
*/
module.exports.setConfig = function(config_json, wallet_json) {
    const ret = wasm.setConfig(addHeapObject(config_json), addHeapObject(wallet_json));
    return takeObject(ret);
};

/**
* @param {number} blockheight
* @param {any} wallet_json
* @returns {any}
*/
module.exports.setBlockheight = function(blockheight, wallet_json) {
    const ret = wasm.setBlockheight(blockheight, addHeapObject(wallet_json));
    return takeObject(ret);
};

/**
* @param {any} token_json
* @param {any} wallet_json
* @returns {any}
*/
module.exports.addToken = function(token_json, wallet_json) {
    const ret = wasm.addToken(addHeapObject(token_json), addHeapObject(wallet_json));
    return takeObject(ret);
};

/**
* @param {string} token_id
* @param {any} wallet_json
* @returns {any}
*/
module.exports.confirmToken = function(token_id, wallet_json) {
    const ptr0 = passStringToWasm0(token_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.confirmToken(ptr0, len0, addHeapObject(wallet_json));
    return takeObject(ret);
};

/**
* @param {any} wallet_json
* @returns {any}
*/
module.exports.getTokens = function(wallet_json) {
    const ret = wasm.getTokens(addHeapObject(wallet_json));
    return takeObject(ret);
};

/**
* @param {any} wallet_json
* @returns {number}
*/
module.exports.getBalance = function(wallet_json) {
    const ret = wasm.getBalance(addHeapObject(wallet_json));
    return ret >>> 0;
};

/**
* @param {any} wallet_json
* @param {number} index
* @param {string} network
* @returns {string}
*/
module.exports.getSCAddress = function(wallet_json, index, network) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.getSCAddress(retptr, addHeapObject(wallet_json), index, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred2_0 = r0;
        deferred2_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
};

/**
* @returns {string}
*/
module.exports.generateMnemonic = function() {
    let deferred1_0;
    let deferred1_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.generateMnemonic(retptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred1_0 = r0;
        deferred1_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
};

/**
* @param {string} name
* @param {string} mnemonic
* @returns {any}
*/
module.exports.fromMnemonic = function(name, mnemonic) {
    const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(mnemonic, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.fromMnemonic(ptr0, len0, ptr1, len1);
    return takeObject(ret);
};

/**
* @param {any} wallet_json
* @returns {any}
*/
module.exports.getActivityLog = function(wallet_json) {
    const ret = wasm.getActivityLog(addHeapObject(wallet_json));
    return takeObject(ret);
};

/**
* @param {any} wallet_json
* @returns {any}
*/
module.exports.getCoins = function(wallet_json) {
    const ret = wasm.getCoins(addHeapObject(wallet_json));
    return takeObject(ret);
};

/**
* @param {any} wallet_json
* @returns {any}
*/
module.exports.getNewCoin = function(wallet_json) {
    const ret = wasm.getNewCoin(addHeapObject(wallet_json));
    return takeObject(ret);
};

/**
* @param {any} coin_json
* @param {string} token_id
* @returns {any}
*/
module.exports.createDepositMsg1 = function(coin_json, token_id) {
    const ptr0 = passStringToWasm0(token_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.createDepositMsg1(addHeapObject(coin_json), ptr0, len0);
    return takeObject(ret);
};

/**
* @param {any} coin_json
* @param {any} deposit_msg_1_response_json
* @returns {any}
*/
module.exports.handleDepositMsg1Response = function(coin_json, deposit_msg_1_response_json) {
    const ret = wasm.handleDepositMsg1Response(addHeapObject(coin_json), addHeapObject(deposit_msg_1_response_json));
    return takeObject(ret);
};

/**
* @param {any} coin_json
* @param {string} network
* @returns {any}
*/
module.exports.createAggregatedAddress = function(coin_json, network) {
    const ptr0 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.createAggregatedAddress(addHeapObject(coin_json), ptr0, len0);
    return takeObject(ret);
};

/**
* @param {any} coin_json
* @returns {any}
*/
module.exports.createAndCommitNonces = function(coin_json) {
    const ret = wasm.createAndCommitNonces(addHeapObject(coin_json));
    return takeObject(ret);
};

/**
* @param {any} coin_json
* @param {string} network
* @returns {string}
*/
module.exports.getUserBackupAddress = function(coin_json, network) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.getUserBackupAddress(retptr, addHeapObject(coin_json), ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred2_0 = r0;
        deferred2_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
};

/**
* @param {any} coin_json
* @param {number} block_height
* @param {number} initlock
* @param {number} interval
* @param {number} fee_rate_sats_per_byte
* @param {number} qt_backup_tx
* @param {string} to_address
* @param {string} network
* @param {boolean} is_withdrawal
* @returns {any}
*/
module.exports.getPartialSigRequest = function(coin_json, block_height, initlock, interval, fee_rate_sats_per_byte, qt_backup_tx, to_address, network, is_withdrawal) {
    const ptr0 = passStringToWasm0(to_address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.getPartialSigRequest(addHeapObject(coin_json), block_height, initlock, interval, fee_rate_sats_per_byte, qt_backup_tx, ptr0, len0, ptr1, len1, is_withdrawal);
    return takeObject(ret);
};

/**
* @param {string} msg
* @param {string} client_partial_sig_hex
* @param {string} server_partial_sig_hex
* @param {string} session_hex
* @param {string} output_pubkey_hex
* @returns {string}
*/
module.exports.createSignature = function(msg, client_partial_sig_hex, server_partial_sig_hex, session_hex, output_pubkey_hex) {
    let deferred6_0;
    let deferred6_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(msg, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(client_partial_sig_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(server_partial_sig_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(session_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len3 = WASM_VECTOR_LEN;
        const ptr4 = passStringToWasm0(output_pubkey_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len4 = WASM_VECTOR_LEN;
        wasm.createSignature(retptr, ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred6_0 = r0;
        deferred6_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred6_0, deferred6_1, 1);
    }
};

/**
* @param {string} encoded_unsigned_tx
* @param {string} signature_hex
* @returns {string}
*/
module.exports.newBackupTransaction = function(encoded_unsigned_tx, signature_hex) {
    let deferred3_0;
    let deferred3_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(encoded_unsigned_tx, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(signature_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.newBackupTransaction(retptr, ptr0, len0, ptr1, len1);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred3_0 = r0;
        deferred3_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
};

/**
* @param {any} backup_tx_json
* @param {any} coin_json
* @param {string} to_address
* @param {number} fee_rate_sats_per_byte
* @param {string} network
* @returns {string}
*/
module.exports.createCpfpTx = function(backup_tx_json, coin_json, to_address, fee_rate_sats_per_byte, network) {
    let deferred3_0;
    let deferred3_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(to_address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.createCpfpTx(retptr, addHeapObject(backup_tx_json), addHeapObject(coin_json), ptr0, len0, fee_rate_sats_per_byte, ptr1, len1);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred3_0 = r0;
        deferred3_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
};

/**
* @param {string} recipient_address
* @param {string} input_txid
* @param {number} input_vout
* @param {string} client_seckey
* @returns {string}
*/
module.exports.createTransferSignature = function(recipient_address, input_txid, input_vout, client_seckey) {
    let deferred4_0;
    let deferred4_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(recipient_address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(input_txid, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(client_seckey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        wasm.createTransferSignature(retptr, ptr0, len0, ptr1, len1, input_vout, ptr2, len2);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred4_0 = r0;
        deferred4_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
    }
};

/**
* @param {string} x1
* @param {string} recipient_address
* @param {any} coin_json
* @param {string} transfer_signature
* @param {any} backup_transactions
* @returns {any}
*/
module.exports.createTransferUpdateMsg = function(x1, recipient_address, coin_json, transfer_signature, backup_transactions) {
    const ptr0 = passStringToWasm0(x1, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(recipient_address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(transfer_signature, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.createTransferUpdateMsg(ptr0, len0, ptr1, len1, addHeapObject(coin_json), ptr2, len2, addHeapObject(backup_transactions));
    return takeObject(ret);
};

/**
* @param {string} sc_address
* @returns {any}
*/
module.exports.decodeTransferAddress = function(sc_address) {
    const ptr0 = passStringToWasm0(sc_address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.decodeTransferAddress(ptr0, len0);
    return takeObject(ret);
};

/**
* @param {string} encrypted_message
* @param {string} private_key_wif
* @returns {any}
*/
module.exports.decryptTransferMsg = function(encrypted_message, private_key_wif) {
    const ptr0 = passStringToWasm0(encrypted_message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(private_key_wif, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.decryptTransferMsg(ptr0, len0, ptr1, len1);
    return takeObject(ret);
};

/**
* @param {any} backup_transactions
* @returns {any}
*/
module.exports.getTx0Outpoint = function(backup_transactions) {
    const ret = wasm.getTx0Outpoint(addHeapObject(backup_transactions));
    return takeObject(ret);
};

/**
* @param {string} new_user_pubkey
* @param {any} tx0_outpoint
* @param {any} transfer_msg
* @returns {boolean}
*/
module.exports.verifyTransferSignature = function(new_user_pubkey, tx0_outpoint, transfer_msg) {
    const ptr0 = passStringToWasm0(new_user_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.verifyTransferSignature(ptr0, len0, addHeapObject(tx0_outpoint), addHeapObject(transfer_msg));
    return ret !== 0;
};

/**
* @param {string} enclave_public_key
* @param {any} transfer_msg
* @param {any} tx0_outpoint
* @param {string} tx0_hex
* @param {string} network
* @returns {boolean}
*/
module.exports.validateTx0OutputPubkey = function(enclave_public_key, transfer_msg, tx0_outpoint, tx0_hex, network) {
    const ptr0 = passStringToWasm0(enclave_public_key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(tx0_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.validateTx0OutputPubkey(ptr0, len0, addHeapObject(transfer_msg), addHeapObject(tx0_outpoint), ptr1, len1, ptr2, len2);
    return ret !== 0;
};

/**
* @param {any} transfer_msg
* @param {string} client_pubkey_share
* @param {string} network
* @returns {boolean}
*/
module.exports.verifyLatestBackupTxPaysToUserPubkey = function(transfer_msg, client_pubkey_share, network) {
    const ptr0 = passStringToWasm0(client_pubkey_share, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.verifyLatestBackupTxPaysToUserPubkey(addHeapObject(transfer_msg), ptr0, len0, ptr1, len1);
    return ret !== 0;
};

/**
* @param {any} tx0_outpoint
* @param {string} tx0_hex
* @param {string} network
* @returns {string}
*/
module.exports.getOutputAddressFromTx0 = function(tx0_outpoint, tx0_hex, network) {
    let deferred3_0;
    let deferred3_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(tx0_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        wasm.getOutputAddressFromTx0(retptr, addHeapObject(tx0_outpoint), ptr0, len0, ptr1, len1);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred3_0 = r0;
        deferred3_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
};

/**
* @param {string} tx_n_hex
* @param {string} tx0_hex
* @param {number} fee_rate_tolerance
* @param {number} current_fee_rate_sats_per_byte
* @returns {any}
*/
module.exports.verifyTransactionSignature = function(tx_n_hex, tx0_hex, fee_rate_tolerance, current_fee_rate_sats_per_byte) {
    const ptr0 = passStringToWasm0(tx_n_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(tx0_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.verifyTransactionSignature(ptr0, len0, ptr1, len1, fee_rate_tolerance, current_fee_rate_sats_per_byte);
    return takeObject(ret);
};

/**
* @param {any} backup_tx
* @param {string} tx0_hex
* @param {any} statechain_info
* @returns {any}
*/
module.exports.verifyBlindedMusigScheme = function(backup_tx, tx0_hex, statechain_info) {
    const ptr0 = passStringToWasm0(tx0_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.verifyBlindedMusigScheme(addHeapObject(backup_tx), ptr0, len0, addHeapObject(statechain_info));
    return takeObject(ret);
};

/**
* @param {any} backup_tx
* @returns {number}
*/
module.exports.getBlockheight = function(backup_tx) {
    const ret = wasm.getBlockheight(addHeapObject(backup_tx));
    return ret >>> 0;
};

/**
* @param {any} statechain_info
* @param {any} transfer_msg
* @param {any} coin
* @returns {any}
*/
module.exports.createTransferReceiverRequestPayload = function(statechain_info, transfer_msg, coin) {
    const ret = wasm.createTransferReceiverRequestPayload(addHeapObject(statechain_info), addHeapObject(transfer_msg), addHeapObject(coin));
    return takeObject(ret);
};

/**
* @param {string} server_public_key_hex
* @param {any} coin
* @param {string} statechain_id
* @param {any} tx0_outpoint
* @param {string} tx0_hex
* @param {string} network
* @returns {any}
*/
module.exports.getNewKeyInfo = function(server_public_key_hex, coin, statechain_id, tx0_outpoint, tx0_hex, network) {
    const ptr0 = passStringToWasm0(server_public_key_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(statechain_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(tx0_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len3 = WASM_VECTOR_LEN;
    const ret = wasm.getNewKeyInfo(ptr0, len0, addHeapObject(coin), ptr1, len1, addHeapObject(tx0_outpoint), ptr2, len2, ptr3, len3);
    return takeObject(ret);
};

/**
* @param {string} address
* @param {string} network
* @returns {boolean}
*/
module.exports.validateAddress = function(address, network) {
    const ptr0 = passStringToWasm0(address, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.validateAddress(ptr0, len0, ptr1, len1);
    return ret !== 0;
};

/**
* @param {string} statechain_id
* @param {any} coin
* @returns {string}
*/
module.exports.signMessage = function(statechain_id, coin) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(statechain_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.signMessage(retptr, ptr0, len0, addHeapObject(coin));
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred2_0 = r0;
        deferred2_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
};

/**
* @param {any} coin
* @param {string} enclave_pubkey
* @returns {boolean}
*/
module.exports.isEnclavePubkeyPartOfCoin = function(coin, enclave_pubkey) {
    const ptr0 = passStringToWasm0(enclave_pubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.isEnclavePubkeyPartOfCoin(addHeapObject(coin), ptr0, len0);
    return ret !== 0;
};

/**
* @param {any} backup_transactions
* @param {any} coin
* @param {string} network
* @returns {any}
*/
module.exports.latestBackuptxPaysToUserpubkey = function(backup_transactions, coin, network) {
    const ptr0 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.latestBackuptxPaysToUserpubkey(addHeapObject(backup_transactions), addHeapObject(coin), ptr0, len0);
    return takeObject(ret);
};

/**
* @param {any} walletJson
* @param {string} authPubkey
* @returns {any}
*/
module.exports.duplicateCoinToInitializedState = function(walletJson, authPubkey) {
    const ptr0 = passStringToWasm0(authPubkey, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.duplicateCoinToInitializedState(addHeapObject(walletJson), ptr0, len0);
    return takeObject(ret);
};

/**
* @param {any} transfer_msg
* @param {any} statechain_info
* @param {string} tx0_hex
* @param {number} fee_rate_tolerance
* @param {number} current_fee_rate_sats_per_byte
* @param {number} interval
* @returns {any}
*/
module.exports.validateSignatureScheme = function(transfer_msg, statechain_info, tx0_hex, fee_rate_tolerance, current_fee_rate_sats_per_byte, interval) {
    const ptr0 = passStringToWasm0(tx0_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.validateSignatureScheme(addHeapObject(transfer_msg), addHeapObject(statechain_info), ptr0, len0, fee_rate_tolerance, current_fee_rate_sats_per_byte, interval);
    return takeObject(ret);
};

/**
* @returns {any}
*/
module.exports.getMockWallet = function() {
    const ret = wasm.getMockWallet();
    return takeObject(ret);
};

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_exn_store(addHeapObject(e));
    }
}

module.exports.__wbindgen_object_drop_ref = function(arg0) {
    takeObject(arg0);
};

module.exports.__wbindgen_string_get = function(arg0, arg1) {
    const obj = getObject(arg1);
    const ret = typeof(obj) === 'string' ? obj : undefined;
    var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len1;
    getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};

module.exports.__wbindgen_boolean_get = function(arg0) {
    const v = getObject(arg0);
    const ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
    return ret;
};

module.exports.__wbindgen_is_string = function(arg0) {
    const ret = typeof(getObject(arg0)) === 'string';
    return ret;
};

module.exports.__wbindgen_is_object = function(arg0) {
    const val = getObject(arg0);
    const ret = typeof(val) === 'object' && val !== null;
    return ret;
};

module.exports.__wbindgen_is_undefined = function(arg0) {
    const ret = getObject(arg0) === undefined;
    return ret;
};

module.exports.__wbindgen_in = function(arg0, arg1) {
    const ret = getObject(arg0) in getObject(arg1);
    return ret;
};

module.exports.__wbindgen_error_new = function(arg0, arg1) {
    const ret = new Error(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
};

module.exports.__wbindgen_number_new = function(arg0) {
    const ret = arg0;
    return addHeapObject(ret);
};

module.exports.__wbindgen_string_new = function(arg0, arg1) {
    const ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
};

module.exports.__wbindgen_jsval_loose_eq = function(arg0, arg1) {
    const ret = getObject(arg0) == getObject(arg1);
    return ret;
};

module.exports.__wbindgen_number_get = function(arg0, arg1) {
    const obj = getObject(arg1);
    const ret = typeof(obj) === 'number' ? obj : undefined;
    getFloat64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? 0 : ret;
    getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
};

module.exports.__wbindgen_object_clone_ref = function(arg0) {
    const ret = getObject(arg0);
    return addHeapObject(ret);
};

module.exports.__wbg_getwithrefkey_15c62c2b8546208d = function(arg0, arg1) {
    const ret = getObject(arg0)[getObject(arg1)];
    return addHeapObject(ret);
};

module.exports.__wbg_set_20cbc34131e76824 = function(arg0, arg1, arg2) {
    getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
};

module.exports.__wbg_crypto_566d7465cdbb6b7a = function(arg0) {
    const ret = getObject(arg0).crypto;
    return addHeapObject(ret);
};

module.exports.__wbg_process_dc09a8c7d59982f6 = function(arg0) {
    const ret = getObject(arg0).process;
    return addHeapObject(ret);
};

module.exports.__wbg_versions_d98c6400c6ca2bd8 = function(arg0) {
    const ret = getObject(arg0).versions;
    return addHeapObject(ret);
};

module.exports.__wbg_node_caaf83d002149bd5 = function(arg0) {
    const ret = getObject(arg0).node;
    return addHeapObject(ret);
};

module.exports.__wbg_require_94a9da52636aacbf = function() { return handleError(function () {
    const ret = module.require;
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbindgen_is_function = function(arg0) {
    const ret = typeof(getObject(arg0)) === 'function';
    return ret;
};

module.exports.__wbg_msCrypto_0b84745e9245cdf6 = function(arg0) {
    const ret = getObject(arg0).msCrypto;
    return addHeapObject(ret);
};

module.exports.__wbg_randomFillSync_290977693942bf03 = function() { return handleError(function (arg0, arg1) {
    getObject(arg0).randomFillSync(takeObject(arg1));
}, arguments) };

module.exports.__wbg_getRandomValues_260cc23a41afad9a = function() { return handleError(function (arg0, arg1) {
    getObject(arg0).getRandomValues(getObject(arg1));
}, arguments) };

module.exports.__wbg_get_44be0491f933a435 = function(arg0, arg1) {
    const ret = getObject(arg0)[arg1 >>> 0];
    return addHeapObject(ret);
};

module.exports.__wbg_length_fff51ee6522a1a18 = function(arg0) {
    const ret = getObject(arg0).length;
    return ret;
};

module.exports.__wbg_new_898a68150f225f2e = function() {
    const ret = new Array();
    return addHeapObject(ret);
};

module.exports.__wbg_newnoargs_581967eacc0e2604 = function(arg0, arg1) {
    const ret = new Function(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
};

module.exports.__wbg_next_526fc47e980da008 = function(arg0) {
    const ret = getObject(arg0).next;
    return addHeapObject(ret);
};

module.exports.__wbg_next_ddb3312ca1c4e32a = function() { return handleError(function (arg0) {
    const ret = getObject(arg0).next();
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_done_5c1f01fb660d73b5 = function(arg0) {
    const ret = getObject(arg0).done;
    return ret;
};

module.exports.__wbg_value_1695675138684bd5 = function(arg0) {
    const ret = getObject(arg0).value;
    return addHeapObject(ret);
};

module.exports.__wbg_iterator_97f0c81209c6c35a = function() {
    const ret = Symbol.iterator;
    return addHeapObject(ret);
};

module.exports.__wbg_get_97b561fb56f034b5 = function() { return handleError(function (arg0, arg1) {
    const ret = Reflect.get(getObject(arg0), getObject(arg1));
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_call_cb65541d95d71282 = function() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).call(getObject(arg1));
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_new_b51585de1b234aff = function() {
    const ret = new Object();
    return addHeapObject(ret);
};

module.exports.__wbg_self_1ff1d729e9aae938 = function() { return handleError(function () {
    const ret = self.self;
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_window_5f4faef6c12b79ec = function() { return handleError(function () {
    const ret = window.window;
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_globalThis_1d39714405582d3c = function() { return handleError(function () {
    const ret = globalThis.globalThis;
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_global_651f05c6a0944d1c = function() { return handleError(function () {
    const ret = global.global;
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_set_502d29070ea18557 = function(arg0, arg1, arg2) {
    getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
};

module.exports.__wbg_isArray_4c24b343cb13cfb1 = function(arg0) {
    const ret = Array.isArray(getObject(arg0));
    return ret;
};

module.exports.__wbg_instanceof_ArrayBuffer_39ac22089b74fddb = function(arg0) {
    let result;
    try {
        result = getObject(arg0) instanceof ArrayBuffer;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
};

module.exports.__wbg_call_01734de55d61e11d = function() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
    return addHeapObject(ret);
}, arguments) };

module.exports.__wbg_isSafeInteger_bb8e18dd21c97288 = function(arg0) {
    const ret = Number.isSafeInteger(getObject(arg0));
    return ret;
};

module.exports.__wbg_entries_e51f29c7bba0c054 = function(arg0) {
    const ret = Object.entries(getObject(arg0));
    return addHeapObject(ret);
};

module.exports.__wbg_buffer_085ec1f694018c4f = function(arg0) {
    const ret = getObject(arg0).buffer;
    return addHeapObject(ret);
};

module.exports.__wbg_newwithbyteoffsetandlength_6da8e527659b86aa = function(arg0, arg1, arg2) {
    const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
};

module.exports.__wbg_new_8125e318e6245eed = function(arg0) {
    const ret = new Uint8Array(getObject(arg0));
    return addHeapObject(ret);
};

module.exports.__wbg_set_5cf90238115182c3 = function(arg0, arg1, arg2) {
    getObject(arg0).set(getObject(arg1), arg2 >>> 0);
};

module.exports.__wbg_length_72e2208bbc0efc61 = function(arg0) {
    const ret = getObject(arg0).length;
    return ret;
};

module.exports.__wbg_instanceof_Uint8Array_d8d9cb2b8e8ac1d4 = function(arg0) {
    let result;
    try {
        result = getObject(arg0) instanceof Uint8Array;
    } catch (_) {
        result = false;
    }
    const ret = result;
    return ret;
};

module.exports.__wbg_newwithlength_e5d69174d6984cd7 = function(arg0) {
    const ret = new Uint8Array(arg0 >>> 0);
    return addHeapObject(ret);
};

module.exports.__wbg_subarray_13db269f57aa838d = function(arg0, arg1, arg2) {
    const ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
};

module.exports.__wbindgen_debug_string = function(arg0, arg1) {
    const ret = debugString(getObject(arg1));
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len1;
    getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};

module.exports.__wbindgen_throw = function(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

module.exports.__wbindgen_memory = function() {
    const ret = wasm.memory;
    return addHeapObject(ret);
};

const path = require('path').join(__dirname, 'mercury_wasm_bg.wasm');
const bytes = require('fs').readFileSync(path);

const wasmModule = new WebAssembly.Module(bytes);
const wasmInstance = new WebAssembly.Instance(wasmModule, imports);
wasm = wasmInstance.exports;
module.exports.__wasm = wasm;

