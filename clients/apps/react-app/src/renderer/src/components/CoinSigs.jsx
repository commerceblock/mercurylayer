import { useDispatch, useSelector } from 'react-redux'
import { useState } from 'react'

export default function CoinSigs({ coin, walletName }) {
  const backupTxs = useSelector((state) => state.wallet.backupTxs)

  if (!coin.statechain_id) return <div></div>

  let backupTxList = backupTxs.filter(
    (backupTx) =>
      backupTx.statechain_id === coin.statechain_id && backupTx.walletName === walletName
  )

  if (backupTxList.length == 0) return <div></div>

  return <>{backupTxList.length}</>
}
