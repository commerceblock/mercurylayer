import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'

import restoreImg from '../../../../resources/welcome_restore_wallet.png?asset&asarUnpack'
import newImg from '../../../../resources/welcome_new_wallet.png?asset&asarUnpack'

const WelcomePage = () => {
  const navigate = useNavigate()

  const onHelpButtonContainerClick = useCallback(() => {
    navigate('/helpandsupportpage')
  }, [navigate])

  const onCogIconClick = useCallback(() => {
    navigate('/settingspage')
  }, [navigate])

  const onLogoutButtonIconClick = useCallback(() => {
    navigate('/')
  }, [navigate])

  const onNewWalletButtonClick = useCallback(() => {
    navigate('/new-wallet-0')
  }, [navigate])

  const onLoadWalletButtonContainerClick = useCallback(() => {
    navigate('/loadwalletpage')
  }, [navigate])

  const onRecoverWalletButtonClick = useCallback(() => {
    navigate('/recoverwalletfrombackuppage')
  }, [navigate])

  return (
    <div className="w-full relative bg-whitesmoke h-[926px] overflow-hidden flex flex-col items-center justify-start gap-[20px] text-left text-[26.4px] text-black font-body-small">
      <NavBar
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        showLogoutButton={false}
        showSettingsButton={false}
        showHelpButton={false}
      />
      <div className="self-stretch h-[450px] flex flex-col items-center justify-center gap-[15px]">
        <div className="self-stretch flex flex-row items-center justify-center p-[25px]">
          <div className="relative">Welcome to Mercury</div>
        </div>
        <div className="self-stretch flex flex-row items-center justify-center py-0 px-[25px] text-[16.1px] text-dimgray-200">
          <div className="flex-1 relative">
            If you’re using Mercury Wallet for the first time, create a new wallet. If you have an
            existing wallet, load the wallet from your device storage, or use your seed phrase or
            backup file to restore the wallet.
          </div>
        </div>
        <div className="self-stretch flex flex-row flex-wrap items-center justify-center py-5 px-2.5 gap-[50px] text-sm">
          <button
            className="cursor-pointer [border:none] py-3 px-4 bg-white rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-12 flex flex-row items-center justify-center box-border gap-[10px]"
            onClick={onNewWalletButtonClick}
          >
            <img className="w-[21px] relative h-[18px] object-cover" alt="" src={newImg} />
            <div className="relative text-sm tracking-[-0.02em] leading-[19px] font-body-small text-black text-left">
              New wallet
            </div>
          </button>
          <div
            className="w-[137px] rounded-md bg-whitesmoke shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-12 flex flex-row items-center justify-center py-3 px-4 box-border gap-[10px] cursor-pointer"
            onClick={onLoadWalletButtonContainerClick}
          >
            <img className="w-[21px] relative h-[18px] object-cover" alt="" src={restoreImg} />
            <div className="relative tracking-[-0.02em] leading-[19px]">Load wallet</div>
          </div>
          <button
            className="cursor-pointer [border:none] py-3 px-4 bg-whitesmoke rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-12 flex flex-row items-center justify-center box-border gap-[10px]"
            onClick={onRecoverWalletButtonClick}
          >
            <img className="w-[21px] relative h-[18px] object-cover" alt="" src={restoreImg} />
            <div className="relative text-sm tracking-[-0.02em] leading-[19px] font-body-small text-black text-left">
              Recover wallet
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default WelcomePage
