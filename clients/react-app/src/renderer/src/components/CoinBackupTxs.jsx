import { useDispatch, useSelector } from 'react-redux'
import { useState } from 'react'

export default function CoinBackupTxs({coin}) {
    const backupTxs = useSelector(state => state.wallet.backupTxs);

    let backupTxList = backupTxs.
        filter((backupTx) => backupTx.statechain_id === coin.statechain_id);

    if (backupTxList.length == 0) return <div></div>;

    backupTxList = backupTxList[0].backupTxs;

    let backupTxHTML = backupTxList.
        map((backupTx, index) => 
            <div key={index}>
                <span>Backup Tx {backupTx.tx_n}: {backupTx.tx.substring(0, 65)}...</span>
            </div>
        );

    return backupTxHTML
}