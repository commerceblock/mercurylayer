import React, { useState } from 'react'
import broadcastBackupTx from '../logic/broadcastBackupTx'
import { useSelector } from 'react-redux'

const CPFPTransaction = ({ coin, wallet }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [toAddress, setToAddress] = useState('')
  const [feeRate, setFeeRate] = useState(0.01)
  const [isError, setIsError] = useState(false)
  const backupTxs = useSelector((state) => state.wallet.backupTxs)

  const createCPFPTransaction = async () => {
    console.log('Creating CPFP transaction')
    if (!toAddress || !feeRate) {
      setIsError(true)
      return
    }
    const CPFP = await broadcastBackupTx.execute(wallet, backupTxs, coin, toAddress, feeRate)
    console.log('CPFP', CPFP)
  }

  return (
    <>
      <div className="flex flex-row items-center gap-4 mt-4">
        <h3 className="text-lg font-semibold">CPFP transaction</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="cursor-pointer bg-mediumslateblue-200 shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] text-white py-1 px-2 rounded-md text-xs"
        >
          {isExpanded ? 'Hide' : 'Show'}
        </button>
      </div>

      {isExpanded && (
        <table>
          <thead>
            <tr>
              <th>Pay to Address</th>
              <th>Fee Rate</th>
              <th></th> {/* Empty column for the create button */}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <input
                  type="text"
                  placeholder="Pay to address"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  className="border border-gray-300 rounded-lg p-2"
                />
              </td>
              <td>
                <input
                  type="text"
                  placeholder="Fee rate"
                  value={feeRate}
                  onChange={(e) => setFeeRate(e.target.value)}
                  className="border border-gray-300 rounded-lg p-2"
                />
              </td>
              <td>
                <button
                  className="cursor-pointer bg-mediumslateblue-200 shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] text-white py-2 px-4 rounded-md"
                  onClick={createCPFPTransaction}
                >
                  Create
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {isError && (
        <div className="text-red text-xs mt-2 text-center">Please fill in all fields</div>
      )}
    </>
  )
}

export default CPFPTransaction
