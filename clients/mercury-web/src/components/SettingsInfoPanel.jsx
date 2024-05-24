import { useEffect, useState } from 'react'
import { walletActions } from '../store/wallet'
import { useDispatch } from 'react-redux'

const SettingsInfoPanel = ({ wallet }) => {
  const dispatch = useDispatch()

  const { settings } = wallet
  const [localSettings, setLocalSettings] = useState(settings)
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleChange = (key, value) => {
    setLocalSettings((prevSettings) => ({
      ...prevSettings,
      [key]: value
    }))
  }

  const handleSave = () => {
    dispatch(
      walletActions.updateSettings({
        walletName: wallet.name,
        settings: localSettings
      })
    )
    setShowNotification(true)
    setTimeout(() => setShowNotification(false), 3000) // Hide notification after 3 seconds
  }

  return (
    <div className="self-stretch shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[650.9px] flex flex-col items-center justify-center text-center text-xs text-black font-body-heavy">
      <div className="self-stretch flex-1 bg-white overflow-hidden flex flex-col items-center justify-start py-2.5 px-[50px] gap-[15px]">
        <div className="self-stretch h-10 flex flex-row items-center justify-center">
          <div className="relative tracking-[-0.02em] leading-[22px] font-semibold">
            Connectivity Settings
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <label className="text-gray-500" htmlFor="blockExplorerURL">
              BlockExplorer URL
            </label>
            <input
              id="blockExplorerURL"
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              type="text"
              value={localSettings.block_explorerURL}
              onChange={(e) => handleChange('block_explorerURL', e.target.value)}
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <label className="text-gray-500" htmlFor="electrumProtocol">
              Electrum Protocol
            </label>
            <input
              id="electrumProtocol"
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              type="text"
              value={localSettings.electrumProtocol}
              onChange={(e) => handleChange('electrumProtocol', e.target.value)}
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <label className="text-gray-500" htmlFor="electrumHost">
              Electrum Host
            </label>
            <input
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              placeholder="Electrum Host"
              type="text"
              value={localSettings.electrumHost}
              onChange={(e) => handleChange('electrumHost', e.target.value)}
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <label className="text-gray-500" htmlFor="electrumPort">
              Electrum Port
            </label>
            <input
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              placeholder="Electrum Port"
              type="text"
              value={localSettings.electrumPort}
              onChange={(e) => handleChange('electrumPort', e.target.value)}
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <label className="text-gray-500" htmlFor="electrumType">
              Electrum Type
            </label>
            <input
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              placeholder="Electrum Type"
              type="text"
              value={localSettings.electrumType}
              onChange={(e) => handleChange('electrumType', e.target.value)}
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <label className="text-gray-500" htmlFor="torProxyHost">
              Tor Proxy Host
            </label>
            <input
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              placeholder="Tor Proxy Host"
              type="text"
              value={localSettings.torProxyHost}
              onChange={(e) => handleChange('torProxyHost', e.target.value)}
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <label className="text-gray-500" htmlFor="torProxyPort">
              Tor Proxy Port
            </label>
            <input
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              placeholder="Tor Proxy Port"
              type="text"
              value={localSettings.torProxyPort}
              onChange={(e) => handleChange('torProxyPort', e.target.value)}
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <label className="text-gray-500" htmlFor="torProxyControlPassword">
              Tor Proxy Control Password
            </label>
            <input
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              placeholder="Tor Proxy Control Password"
              type="text"
              value={localSettings.torProxyControlPassword}
              onChange={(e) => handleChange('torProxyControlPassword', e.target.value)}
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <label className="text-gray-500" htmlFor="torProxyControlPort">
              Tor Proxy Control Port
            </label>
            <input
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              placeholder="Tor Proxy Control Port"
              type="text"
              value={localSettings.torProxyControlPort}
              onChange={(e) => handleChange('torProxyControlPort', e.target.value)}
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <label className="text-gray-500" htmlFor="statechainEntityApi">
              Statechain Entity API
            </label>
            <input
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              placeholder="Statechain Entity API"
              type="text"
              value={localSettings.statechainEntityApi}
              onChange={(e) => handleChange('statechainEntityApi', e.target.value)}
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <label className="text-gray-500" htmlFor="torStatechainEntityApi">
              Tor Statechain Entity API
            </label>
            <input
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              placeholder="Tor Statechain Entity API"
              type="text"
              value={localSettings.torStatechainEntityApi}
              onChange={(e) => handleChange('torStatechainEntityApi', e.target.value)}
            />
          </div>
        </div>
        <button
          className="cursor-pointer [border:none] p-0 bg-mediumslateblue-200 w-[162px] rounded-sm shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[27px] overflow-hidden shrink-0 flex flex-row items-center justify-center"
          onClick={() => {
            handleSave()
          }}
        >
          <div className="self-stretch flex-1 relative text-xs tracking-[-0.02em] leading-[22px] font-semibold font-body-heavy text-white text-center flex items-center justify-center">
            SAVE
          </div>
        </button>
        {showNotification && (
          <div className="self-stretch h-auto flex flex-col items-center justify-start">
            <div className="self-stretch flex-1 flex flex-col items-center justify-end">
              <div className="text-green-500 font-bold">Settings saved successfully!</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsInfoPanel
