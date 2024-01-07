import * as mercury_wasm from 'mercury-wasm';

const newTransferAddress = (wallet) => {
    let coin = mercury_wasm.getNewCoin(wallet);
    return { "newCoin": coin, "walletName": wallet.name };
}

export default { newTransferAddress };