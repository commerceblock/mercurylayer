import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import SettingsHeaderPanel from '../components/SettingsHeaderPanel'
import SettingsInfoPanel from '../components/SettingsInfoPanel'
import { useLoggedInWallet } from '../hooks/walletHooks'

const SettingsPage = () => {
  const navigate = useNavigate()
  const loggedInWallet = useLoggedInWallet()

  const onHelpButtonContainerClick = useCallback(() => {
    navigate('/helpandsupportpage')
  }, [navigate])

  const onCogIconClick = useCallback(() => {
    navigate('/settingspage')
  }, [navigate])

  const onLogoutButtonIconClick = useCallback(() => {
    navigate('/')
  }, [navigate])

  return (
    <div className="w-full relative bg-whitesmoke h-[926px] flex flex-col items-center justify-start gap-[24px]">
      <NavBar
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        showLogoutButton
        showSettingsButton
        showHelpButton
      />
      <div className="self-stretch h-[137px] flex flex-col items-start justify-start p-2.5 box-border">
        <SettingsHeaderPanel wallet={loggedInWallet} />
      </div>
      <div className="self-stretch flex-1 flex flex-col items-center justify-start py-5 px-2.5">
        <SettingsInfoPanel wallet={loggedInWallet} />
      </div>
    </div>
  )
}

export default SettingsPage
