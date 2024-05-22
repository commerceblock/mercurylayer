/* tslint:disable */
/* eslint-disable */
/**
* @param {any} config_json
* @param {any} wallet_json
* @returns {any}
*/
export function setConfig(config_json: any, wallet_json: any): any;
/**
* @param {number} blockheight
* @param {any} wallet_json
* @returns {any}
*/
export function setBlockheight(blockheight: number, wallet_json: any): any;
/**
* @param {any} token_json
* @param {any} wallet_json
* @returns {any}
*/
export function addToken(token_json: any, wallet_json: any): any;
/**
* @param {string} token_id
* @param {any} wallet_json
* @returns {any}
*/
export function confirmToken(token_id: string, wallet_json: any): any;
/**
* @param {any} wallet_json
* @returns {any}
*/
export function getTokens(wallet_json: any): any;
/**
* @param {any} wallet_json
* @returns {number}
*/
export function getBalance(wallet_json: any): number;
/**
* @param {any} wallet_json
* @param {number} index
* @param {string} network
* @returns {string}
*/
export function getSCAddress(wallet_json: any, index: number, network: string): string;
/**
* @returns {string}
*/
export function generateMnemonic(): string;
/**
* @param {string} name
* @param {string} mnemonic
* @returns {any}
*/
export function fromMnemonic(name: string, mnemonic: string): any;
/**
* @param {any} wallet_json
* @returns {any}
*/
export function getActivityLog(wallet_json: any): any;
/**
* @param {any} wallet_json
* @returns {any}
*/
export function getCoins(wallet_json: any): any;
/**
* @param {any} wallet_json
* @returns {any}
*/
export function getNewCoin(wallet_json: any): any;
/**
* @param {any} coin_json
* @param {string} token_id
* @returns {any}
*/
export function createDepositMsg1(coin_json: any, token_id: string): any;
/**
* @param {any} coin_json
* @param {any} deposit_msg_1_response_json
* @returns {any}
*/
export function handleDepositMsg1Response(coin_json: any, deposit_msg_1_response_json: any): any;
/**
* @param {any} coin_json
* @param {string} network
* @returns {any}
*/
export function createAggregatedAddress(coin_json: any, network: string): any;
/**
* @param {any} coin_json
* @returns {any}
*/
export function createAndCommitNonces(coin_json: any): any;
/**
* @param {any} coin_json
* @param {string} network
* @returns {string}
*/
export function getUserBackupAddress(coin_json: any, network: string): string;
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
export function getPartialSigRequest(coin_json: any, block_height: number, initlock: number, interval: number, fee_rate_sats_per_byte: number, qt_backup_tx: number, to_address: string, network: string, is_withdrawal: boolean): any;
/**
* @param {string} msg
* @param {string} client_partial_sig_hex
* @param {string} server_partial_sig_hex
* @param {string} session_hex
* @param {string} output_pubkey_hex
* @returns {string}
*/
export function createSignature(msg: string, client_partial_sig_hex: string, server_partial_sig_hex: string, session_hex: string, output_pubkey_hex: string): string;
/**
* @param {string} encoded_unsigned_tx
* @param {string} signature_hex
* @returns {string}
*/
export function newBackupTransaction(encoded_unsigned_tx: string, signature_hex: string): string;
/**
* @param {any} backup_tx_json
* @param {any} coin_json
* @param {string} to_address
* @param {number} fee_rate_sats_per_byte
* @param {string} network
* @returns {string}
*/
export function createCpfpTx(backup_tx_json: any, coin_json: any, to_address: string, fee_rate_sats_per_byte: number, network: string): string;
/**
* @param {string} recipient_address
* @param {string} input_txid
* @param {number} input_vout
* @param {string} client_seckey
* @returns {string}
*/
export function createTransferSignature(recipient_address: string, input_txid: string, input_vout: number, client_seckey: string): string;
/**
* @param {string} x1
* @param {string} recipient_address
* @param {any} coin_json
* @param {string} transfer_signature
* @param {any} backup_transactions
* @returns {any}
*/
export function createTransferUpdateMsg(x1: string, recipient_address: string, coin_json: any, transfer_signature: string, backup_transactions: any): any;
/**
* @param {string} sc_address
* @returns {any}
*/
export function decodeTransferAddress(sc_address: string): any;
/**
* @param {string} encrypted_message
* @param {string} private_key_wif
* @returns {any}
*/
export function decryptTransferMsg(encrypted_message: string, private_key_wif: string): any;
/**
* @param {any} backup_transactions
* @returns {any}
*/
export function getTx0Outpoint(backup_transactions: any): any;
/**
* @param {string} new_user_pubkey
* @param {any} tx0_outpoint
* @param {any} transfer_msg
* @returns {boolean}
*/
export function verifyTransferSignature(new_user_pubkey: string, tx0_outpoint: any, transfer_msg: any): boolean;
/**
* @param {string} enclave_public_key
* @param {any} transfer_msg
* @param {any} tx0_outpoint
* @param {string} tx0_hex
* @param {string} network
* @returns {boolean}
*/
export function validateTx0OutputPubkey(enclave_public_key: string, transfer_msg: any, tx0_outpoint: any, tx0_hex: string, network: string): boolean;
/**
* @param {any} transfer_msg
* @param {string} client_pubkey_share
* @param {string} network
* @returns {boolean}
*/
export function verifyLatestBackupTxPaysToUserPubkey(transfer_msg: any, client_pubkey_share: string, network: string): boolean;
/**
* @param {any} tx0_outpoint
* @param {string} tx0_hex
* @param {string} network
* @returns {string}
*/
export function getOutputAddressFromTx0(tx0_outpoint: any, tx0_hex: string, network: string): string;
/**
* @param {string} tx_n_hex
* @param {string} tx0_hex
* @param {number} fee_rate_tolerance
* @param {number} current_fee_rate_sats_per_byte
* @returns {any}
*/
export function verifyTransactionSignature(tx_n_hex: string, tx0_hex: string, fee_rate_tolerance: number, current_fee_rate_sats_per_byte: number): any;
/**
* @param {any} backup_tx
* @param {string} tx0_hex
* @param {any} statechain_info
* @returns {any}
*/
export function verifyBlindedMusigScheme(backup_tx: any, tx0_hex: string, statechain_info: any): any;
/**
* @param {any} backup_tx
* @returns {number}
*/
export function getBlockheight(backup_tx: any): number;
/**
* @param {any} statechain_info
* @param {any} transfer_msg
* @param {any} coin
* @returns {any}
*/
export function createTransferReceiverRequestPayload(statechain_info: any, transfer_msg: any, coin: any): any;
/**
* @param {string} server_public_key_hex
* @param {any} coin
* @param {string} statechain_id
* @param {any} tx0_outpoint
* @param {string} tx0_hex
* @param {string} network
* @returns {any}
*/
export function getNewKeyInfo(server_public_key_hex: string, coin: any, statechain_id: string, tx0_outpoint: any, tx0_hex: string, network: string): any;
/**
* @param {string} address
* @param {string} network
* @returns {boolean}
*/
export function validateAddress(address: string, network: string): boolean;
/**
* @param {string} statechain_id
* @param {any} coin
* @returns {string}
*/
export function signMessage(statechain_id: string, coin: any): string;
/**
* @param {any} coin
* @param {string} enclave_pubkey
* @returns {boolean}
*/
export function isEnclavePubkeyPartOfCoin(coin: any, enclave_pubkey: string): boolean;
/**
* @param {any} backup_transactions
* @param {any} coin
* @param {string} network
* @returns {any}
*/
export function latestBackuptxPaysToUserpubkey(backup_transactions: any, coin: any, network: string): any;
/**
* @returns {any}
*/
export function getMockWallet(): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly setConfig: (a: number, b: number) => number;
  readonly setBlockheight: (a: number, b: number) => number;
  readonly addToken: (a: number, b: number) => number;
  readonly confirmToken: (a: number, b: number, c: number) => number;
  readonly getTokens: (a: number) => number;
  readonly getBalance: (a: number) => number;
  readonly getSCAddress: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly generateMnemonic: (a: number) => void;
  readonly fromMnemonic: (a: number, b: number, c: number, d: number) => number;
  readonly getActivityLog: (a: number) => number;
  readonly getCoins: (a: number) => number;
  readonly getNewCoin: (a: number) => number;
  readonly createDepositMsg1: (a: number, b: number, c: number) => number;
  readonly handleDepositMsg1Response: (a: number, b: number) => number;
  readonly createAggregatedAddress: (a: number, b: number, c: number) => number;
  readonly createAndCommitNonces: (a: number) => number;
  readonly getUserBackupAddress: (a: number, b: number, c: number, d: number) => void;
  readonly getPartialSigRequest: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => number;
  readonly createSignature: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => void;
  readonly newBackupTransaction: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly createCpfpTx: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
  readonly createTransferSignature: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
  readonly createTransferUpdateMsg: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
  readonly decodeTransferAddress: (a: number, b: number) => number;
  readonly decryptTransferMsg: (a: number, b: number, c: number, d: number) => number;
  readonly getTx0Outpoint: (a: number) => number;
  readonly verifyTransferSignature: (a: number, b: number, c: number, d: number) => number;
  readonly validateTx0OutputPubkey: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
  readonly verifyLatestBackupTxPaysToUserPubkey: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly getOutputAddressFromTx0: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly verifyTransactionSignature: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly verifyBlindedMusigScheme: (a: number, b: number, c: number, d: number) => number;
  readonly getBlockheight: (a: number) => number;
  readonly createTransferReceiverRequestPayload: (a: number, b: number, c: number) => number;
  readonly getNewKeyInfo: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => number;
  readonly validateAddress: (a: number, b: number, c: number, d: number) => number;
  readonly signMessage: (a: number, b: number, c: number, d: number) => void;
  readonly isEnclavePubkeyPartOfCoin: (a: number, b: number, c: number) => number;
  readonly latestBackuptxPaysToUserpubkey: (a: number, b: number, c: number, d: number) => number;
  readonly getMockWallet: () => number;
  readonly rustsecp256k1zkp_v0_8_1_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1zkp_v0_8_1_default_error_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_8_1_context_create: (a: number) => number;
  readonly rustsecp256k1_v0_8_1_context_destroy: (a: number) => void;
  readonly rustsecp256k1_v0_8_1_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_8_1_default_error_callback_fn: (a: number, b: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
