import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import WalletLoadContainer from '../components/WalletLoadContainer'
import { useDispatch, useSelector } from 'react-redux'
import walletManager from '../logic/walletManager'
import { walletActions } from '../store/wallet'

const LoadWalletPage = () => {
  const encrypted_wallets = useSelector((state) => state.encryptedWallets.encrypted_wallets)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [password, setPassword] = useState('')
  const [isIncorrectPassword, setIsIncorrectPassword] = useState(false)

  const onNavNavMenuClick = useCallback(() => {
    navigate('/')
  }, [navigate])

  const onHelpButtonContainerClick = useCallback(() => {
    navigate('/helpandsupportpage')
  }, [navigate])

  const onCogIconClick = useCallback(() => {
    navigate('/settingspage')
  }, [navigate])

  const onLogoutButtonIconClick = useCallback(() => {
    navigate('/')
  }, [navigate])

  const onOpenButtonClick = async (selectedWallet) => {
    const walletObject = encrypted_wallets.find((wallet) => wallet.name === selectedWallet)
    if (walletObject) {
      console.log('wallet loaded was:', walletObject)
      try {
        let decryptedString = walletManager.decryptString(walletObject.encrypted_wallet, password)
        console.log('decryptedString value:', decryptedString)

        let wallet_json = JSON.parse(decryptedString)

        console.log('wallet_json:', wallet_json)

        setIsIncorrectPassword(false)
        // load the string into the wallet
        dispatch(walletActions.loadWallet(wallet_json))
        dispatch(walletActions.setPassword(password))
        dispatch(walletActions.selectWallet(wallet_json.name))
        navigate('/mainpage')
      } catch (e) {
        console.error('decryptedString error: ', e)
        // TODO set error message in the UI
        setIsIncorrectPassword(true)
      }
    }
  }

  const walletLoaded = encrypted_wallets.length > 0 // Determine if wallets are present

  return (
    <div className="w-full relative bg-whitesmoke h-[926px] overflow-hidden flex flex-col items-center justify-start gap-[82px]">
      <NavBar
        onNavNavMenuClick={onNavNavMenuClick}
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        showLogoutButton={false}
        showSettingsButton={false}
        showHelpButton={false}
      />
      <WalletLoadContainer
        encrypted_wallets={encrypted_wallets}
        walletLoaded={walletLoaded}
        onOpenButtonClick={onOpenButtonClick}
        password={password}
        setPassword={setPassword}
        isIncorrectPassword={isIncorrectPassword}
        setIsIncorrectPassword={setIsIncorrectPassword}
      />
    </div>
  )
}

export default LoadWalletPage
