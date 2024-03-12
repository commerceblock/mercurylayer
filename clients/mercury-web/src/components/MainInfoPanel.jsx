import { useEffect, useState } from 'react'
// react components
import CoinItem from './CoinItem'
import ActivityItem from './ActivityItem'
import CoinBackupTxs from './CoinBackupTxs'
import CoinSigs from './CoinSigs'
// logic imports
import coinStatus from '../logic/coinStatus'
import CPFPTransaction from './CPFPTransaction'

const CoinModal = ({ coin, wallet, hasLowestLocktime, onClose }) => {
  const [expiryTime, setExpiryTime] = useState(null)
  const walletName = wallet.name

  const calcuateLocktime = async (locktime) => {
    if (expiryTime === null) {
      const blockHeight = await coinStatus.getBlockHeight()
      console.log('locktime was:', locktime)
      console.log('blockheight was:', blockHeight)
      const value = (locktime - blockHeight) * 600
      setExpiryTime(convertTimeToDate(value))
    }
  }

  const convertTimeToDate = (seconds) => {
    // using the seconds left, calculate a date
    const date = new Date()
    date.setSeconds(date.getSeconds() + seconds)
    return date.toLocaleString()
  }

  useEffect(() => {
    calcuateLocktime(coin.locktime)
  }, [expiryTime])

  const getUtxo = () => {
    if (coin.utxo_txid && (coin.utxo_vout !== undefined || coin.utxo_vout !== null)) {
      return `${coin.utxo_txid}:${coin.utxo_vout}`
    }
    return ''
  }

  return (
    <div className="relative z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-40 transition-opacity"></div>

      <div className="fixed inset-0 z-10 w-screen flex items-center justify-center shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)]">
        <div className="relative p-4 text-center sm:p-0">
          <div className="flex min-h-full items-end justify-center text-center">
            <div className="p-5 relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <h2 className="text-lg font-semibold text-center mb-4 text-black">Coin Details</h2>
              <table className="w-full mb-4">
                <tbody>
                  <tr>
                    <td className="pr-4 py-2">txid:vout</td>
                    <td className="py-2">{getUtxo()}</td>
                  </tr>
                  <tr>
                    <td className="pr-4 py-2">n_sigs</td>
                    <td className="py-2">
                      <CoinSigs coin={coin} walletName={walletName} />
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-4 py-2">expires</td>
                    <td className="py-2">{expiryTime}</td>
                  </tr>
                </tbody>
              </table>
              {hasLowestLocktime && (
                <>
                  <h3 className="text-lg font-semibold mt-4 text-black">Backup Transactions</h3>
                  <CoinBackupTxs coin={coin} walletName={walletName} />
                </>
              )}
              <>
                <CPFPTransaction coin={coin} wallet={wallet} />
              </>
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="cursor-pointer rounded-3xs border-[1px] border-solid bg-white border-silver-100 py-2 px-4 mt-4 w-auto"
                >
                  CLOSE
                </button>
              </div>
            </div>
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
      {console.log(selectedCoin)}
      {selectedCoin && selectedCoin.status === 'CONFIRMED' && (
        <CoinModal
          coin={selectedCoin}
          onClose={() => setSelectedCoin(null)}
          hasLowestLocktime={true}
          wallet={wallet}
        />
      )}
    </div>
  )
}

export default MainInfoPanel
