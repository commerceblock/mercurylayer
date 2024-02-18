import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import walletManager from '../logic/walletManager'
import { useDispatch } from 'react-redux'
import { walletActions } from '../store/wallet'

const RecoverWalletFromBackupPage = () => {
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState(null) // State to store the error message
  const navigate = useNavigate()
  const dispatch = useDispatch()

  // Function to check if an object looks well-formatted
  function isWellFormatted(obj) {
    return obj.hasOwnProperty('name') && obj.hasOwnProperty('wallet_json')
  }

  // Function to check if a string is valid JSON
  function isValidJSON(str) {
    try {
      JSON.parse(str)
      return true
    } catch (e) {
      return false
    }
  }

  // Usage in your code
  useEffect(() => {
    const handleImportWalletData = async (event, backupData) => {
      try {
        console.log('[handleImportWalletData]:', backupData)

        // Check if backupData is valid JSON
        if (isValidJSON(backupData)) {
          const parsedData = JSON.parse(backupData)

          // Check if parsedData is well-formatted
          if (isWellFormatted(parsedData)) {
            console.log('Backup data is well-formatted')

            try {
              console.log('parsedData:', parsedData.wallet_json)
              console.log('password:', password)

              // attempt to decrypt the wallet_json
              let decryptedString = walletManager.decryptString(parsedData.wallet_json, password)

              console.log('decryptedString:', decryptedString)

              let wallet_json = JSON.parse(decryptedString)
              console.log('wallet_json:', wallet_json)
              // load the string into the wallet
              await dispatch(walletActions.loadWallet(wallet_json))
              await dispatch(walletActions.setPassword(password))
              await dispatch(walletActions.selectWallet(wallet_json.name))
              navigate('/mainpage')
            } catch (e) {
              setErrorMessage('Wrong file or password')
            }
          } else {
            console.log('Backup data is not well-formatted')
            setErrorMessage('Backup data is not well-formatted')
          }
        } else {
          console.log('Backup data is not valid JSON')
          setErrorMessage('Backup data is not valid JSON')
        }
      } catch (e) {
        console.error('Error:', e)
        setErrorMessage(`An error occurred: ${e.message}`)
      }
    }

    if (window.electron && window.electron.ipcRenderer) {
      console.log('Adding listener for received-backup-data')
      window.electron.ipcRenderer.on('received-backup-data', handleImportWalletData)
      return () =>
        window.electron.ipcRenderer.removeListener('received-backup-data', handleImportWalletData)
    }
  }, [dispatch, navigate, password])

  const onHelpButtonContainerClick = useCallback(() => {
    navigate('/helpandsupportpage')
  }, [navigate])

  const onCogIconClick = useCallback(() => {
    navigate('/settingspage')
  }, [navigate])

  const onLogoutButtonIconClick = useCallback(() => {
    navigate('/')
  }, [navigate])

  const onStateOnContainerClick = useCallback(() => {
    navigate('/recoverwalletfromseedpage')
  }, [navigate])

  const onSelectBackupFileButtonClick = useCallback(() => {
    console.log('password entered was:', password)

    window.api.selectBackupFile()
  }, [navigate])

  const onGoBackButtonClick = () => {
    navigate('/')
  }

  return (
    <div className="w-full relative bg-whitesmoke h-[926px] overflow-hidden flex flex-col items-center justify-start gap-[22px] text-center text-base text-primary font-body-small">
      <NavBar
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        showLogoutButton={false}
        showSettingsButton={false}
        showHelpButton={false}
      />
      <div className="self-stretch rounded-8xs overflow-hidden flex flex-row items-center justify-center py-7 px-0">
        <div
          className="flex-1 relative bg-white box-border h-[47px] overflow-hidden cursor-pointer border-b-[1px] border-solid border-tertiary"
          onClick={onStateOnContainerClick}
        >
          <div className="absolute w-full top-[calc(50%_-_11.5px)] left-[0px] tracking-[-0.02em] leading-[22px] inline-block h-11">
            Restore from Seed
          </div>
        </div>
        <div className="flex-1 relative bg-white box-border h-12 overflow-hidden border-b-[2px] border-solid border-royalblue-100">
          <div className="absolute w-full top-[calc(50%_-_12px)] left-[0px] tracking-[-0.02em] leading-[22px] font-semibold inline-block">
            Restore from Backup
          </div>
        </div>
      </div>
      <div className="self-stretch flex-1 flex flex-col items-center justify-start gap-[22px] text-left text-sm">
        <div className="w-[345px] flex flex-col items-start justify-end gap-[7px]">
          <div className="relative tracking-[-0.02em] leading-[19px]" />
          <input
            className="[outline:none] font-body-small text-base bg-white self-stretch rounded-md box-border h-12 flex flex-row items-start justify-start p-3 text-darkgray-300 border-[1px] border-solid border-primary"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {errorMessage && (
          <div className="text-red font-bold text-xl mt-4">Error: {errorMessage}</div>
        )}
        <div className="self-stretch flex-1 flex flex-row items-start justify-center gap-[20px]">
          <button
            className="cursor-pointer [border:none] py-3 px-4 bg-dimgray-100 w-[114px] rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center box-border"
            onClick={onGoBackButtonClick}
          >
            <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body-small text-white text-left">
              GO BACK
            </div>
          </button>
          <button
            className="cursor-pointer [border:none] py-3 px-4 bg-mediumslateblue-200 w-[114px] rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center box-border"
            onClick={onSelectBackupFileButtonClick}
          >
            <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body-small text-white text-left">
              LOAD FILE
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default RecoverWalletFromBackupPage
