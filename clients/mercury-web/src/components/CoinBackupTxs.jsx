import { useDispatch, useSelector } from 'react-redux'
import { useState } from 'react'

export default function CoinBackupTxs({ coin, walletName }) {
  const backupTxs = useSelector((state) => state.wallet.backupTxs)
  const [copied, setCopied] = useState(false) // State to track if the text is copied

  if (!coin.statechain_id) return <div></div>

  let backupTxList = backupTxs.filter(
    (backupTx) =>
      backupTx.statechain_id === coin.statechain_id && backupTx.walletName === walletName
  )

  if (backupTxList.length == 0) return <div></div>

  backupTxList = backupTxList[0].backupTxs

  let backupTxHTML = backupTxList.map((backupTx, index) => (
    <div style={{ marginTop: 10 }} key={index}>
      <span>
        tx {backupTx.tx_n}: {backupTx.tx.substring(0, 65)}...
      </span>
      <button
        onClick={() => {
          // Copy the text to the clipboard
          navigator.clipboard.writeText(backupTx.tx)
          setCopied(true)
        }}
        className="cursor-pointer bg-gray-200 text-white py-1 px-2 rounded-md ml-2 hover:opacity-95"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  ))

  return backupTxHTML
}
