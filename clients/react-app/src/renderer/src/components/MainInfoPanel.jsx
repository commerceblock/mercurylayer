import { useState } from 'react'
import CoinItem from './CoinItem'
import ActivityItem from './ActivityItem'
import CoinBackupTxs from './CoinBackupTxs'

const CoinModal = ({ coin, walletName, hasLowestLocktime, onClose }) => {
  const getUtxo = () => {
    if (coin.utxo_txid && (coin.utxo_vout !== undefined || coin.utxo_vout !== null)) {
      return `${coin.utxo_txid}:${coin.utxo_vout}`
    }
    return ''
  }

  return (
    <div class="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="p-5 relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <h2 className="text-lg font-semibold text-center mb-4">Coin Details</h2>
            <table className="w-full mb-4">
              <tbody>
                <tr>
                  <td className="pr-4 py-2">Index</td>
                  <td className="py-2">{coin.index}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-2">User PubKey Share</td>
                  <td className="py-2">{coin.user_pubkey}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-2">Auth PubKey</td>
                  <td className="py-2">{coin.auth_pubkey}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-2">Derivation Path</td>
                  <td className="py-2">{coin.derivation_path}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-2">Fingerprint</td>
                  <td className="py-2">{coin.fingerprint}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-2">Statechain Id</td>
                  <td className="py-2">{coin.statechain_id}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-2">SE Address</td>
                  <td className="py-2">{coin.address}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-2">Backup Address</td>
                  <td className="py-2">{coin.backup_address}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-2">Server PubKey Share</td>
                  <td className="py-2">{coin.server_pubkey}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-2">Aggregated Pubkey</td>
                  <td className="py-2">{coin.aggregated_pubkey}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-2">Aggregated Address</td>
                  <td className="py-2">{coin.aggregated_address}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-2">TXID:VOUT</td>
                  <td className="py-2">{getUtxo()}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-2">Amount</td>
                  <td className="py-2">{coin.amount} SATS</td>
                </tr>
                <tr>
                  <td className="pr-4 py-2">Locktime</td>
                  <td className="py-2">{coin.locktime}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-2">Withdrawal Address</td>
                  <td className="py-2">{coin.withdrawal_address}</td>
                </tr>
                <tr>
                  <td className="pr-4 py-2">Status</td>
                  <td className="py-2">{coin.status}</td>
                </tr>
              </tbody>
            </table>
            {hasLowestLocktime && (
              <>
                <h3 className="text-lg font-semibold mt-4">Backup Transactions</h3>
                <CoinBackupTxs coin={coin} walletName={walletName} />
              </>
            )}
            <button
              onClick={onClose}
              className="bg-primary text-white py-2 px-4 rounded-md mt-4 w-auto"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const MainInfoPanel = ({ coins, activities, wallet }) => {
  const [activeTab, setActiveTab] = useState('Statecoins')
  const [selectedCoin, setSelectedCoin] = useState(null)

  const filteredCoins = coins.filter(
    (coin) =>
      coin.status !== 'WITHDRAWN' && coin.amount !== undefined && coin.status !== 'TRANSFERRED'
  )

  const handleTabClick = (tab) => {
    setActiveTab(tab)
  }

  return (
    <div className="self-stretch flex-1 rounded-sm bg-white shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] overflow-hidden flex flex-col items-center justify-start p-2.5 gap-[10px] text-center text-base text-primary font-body-small">
      <div className="self-stretch flex flex-row items-start justify-center gap-[10px]">
        <div
          className={`flex-1 relative bg-white box-border h-12 overflow-hidden border-b-[2px] border-solid cursor-pointer ${
            activeTab === 'Statecoins' ? 'border-primary' : 'border-tertiary'
          }`}
          onClick={() => handleTabClick('Statecoins')}
        >
          <div
            className={`absolute w-full top-[calc(50%_-_12px)] left-[0px] tracking-[-0.02em] leading-[22px] font-semibold inline-block text-primary`}
          >
            Statecoins
          </div>
        </div>
        <div
          className={`flex-1 relative bg-white box-border h-12 overflow-hidden border-b-[2px] border-solid cursor-pointer ${
            activeTab === 'Activity Log' ? 'border-primary' : 'border-tertiary'
          }`}
          onClick={() => handleTabClick('Activity Log')}
        >
          <div
            className={`absolute w-full top-[calc(50%_-_12px)] left-[0px] tracking-[-0.02em] leading-[22px] font-semibold inline-block text-primary`}
          >
            Activity Log
          </div>
        </div>
      </div>

      <div className="self-stretch flex-1 overflow-y-auto flex flex-col items-center justify-start gap-[10px]">
        {activeTab === 'Statecoins' && (
          <>
            {filteredCoins && filteredCoins.length > 0 ? (
              filteredCoins.map((coin, index) => {
                console.log('Coin:', coin) // Log each coin for debugging
                return <CoinItem key={index} coin={coin} onClick={() => setSelectedCoin(coin)} /> // when clicking on a coin item, open a modal.
              })
            ) : (
              <p>No coins found.</p>
            )}
          </>
        )}
        {activeTab === 'Activity Log' && (
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            {activities && activities.length > 0 ? (
              <table className="min-w-full">
                <thead>
                  <tr className="">
                    <th className="px-4 py-2">Action</th>
                    <th className="px-4 py-2">UTXO</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity, index) => (
                    <ActivityItem key={index} activity={activity} />
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-4 py-2">No activity found.</p>
            )}
          </div>
        )}
      </div>

      {selectedCoin && (
        <CoinModal
          coin={selectedCoin}
          onClose={() => setSelectedCoin(null)}
          hasLowestLocktime={true}
          walletName={wallet.name}
        />
      )}
    </div>
  )
}

export default MainInfoPanel
