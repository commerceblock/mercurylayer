import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'

import { useDispatch, useSelector } from 'react-redux'
import { wizardActions } from '../store/wizard'

const WalletWizardPage = () => {
  // NBL
  const dispatch = useDispatch()
  const wizardState = useSelector((state) => state.wizard)
  // NBL

  const navigate = useNavigate()

  const onConfirmationChange = useCallback(() => {
    // Dispatch action to update the confirmation state
    dispatch(wizardActions.setConfirmation(!wizardState.confirmation))
  }, [dispatch, wizardState])

  const onHelpButtonContainerClick = useCallback(() => {
    navigate('/helpandsupportpage')
  }, [navigate])

  const onCogIconClick = useCallback(() => {
    navigate('/settingspage')
  }, [navigate])

  const onLogoutButtonIconClick = useCallback(() => {
    navigate('/')
  }, [navigate])

  const onGoBackButtonClick = useCallback(() => {
    navigate('/')
  }, [navigate])

  const onNextButtonClick = useCallback(() => {
    // Check if the confirmation is pressed before navigating
    if (wizardState.confirmation) {
      navigate('/new-wallet-1')
    } else {
      console.warn('Please confirm before proceeding.')
    }
  }, [dispatch, navigate, wizardState])

  return (
    <div className="w-full relative bg-whitesmoke h-[926px] flex flex-col items-center justify-start gap-[13px] text-left text-sm text-gray-300 font-body-small">
      <NavBar
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        showLogoutButton={false}
        showSettingsButton={false}
        showHelpButton={false}
      />
      <div className="self-stretch h-[90px] flex flex-row items-center justify-center">
        <div className="self-stretch flex-1 flex flex-row items-center justify-center gap-[48px]">
          <div className="w-[68px] relative h-[43px] text-mediumslateblue-300">
            <div className="absolute top-[26px] left-[calc(50%_-_34px)] font-extralight">
              Wallet Info
            </div>
            <div className="absolute top-[0px] left-[calc(50%_-_34px)] rounded-[50%] bg-mediumslateblue-300 w-[22px] h-[22px]" />
            <div className="absolute top-[2px] left-[calc(50%_-_26px)] font-extralight text-white">
              1
            </div>
          </div>
          <div className="w-[75px] relative h-[43px]">
            <div className="absolute top-[26px] left-[calc(50%_-_37.5px)] font-extralight">
              Wallet seed
            </div>
            <div className="absolute top-[calc(50%_-_21.5px)] left-[calc(50%_-_37.5px)] rounded-[50%] bg-gray-500 w-[22px] h-[22px]" />
            <div className="absolute top-[calc(50%_-_19.5px)] left-[calc(50%_-_30.5px)] font-extralight text-white">
              2
            </div>
          </div>
          <div className="w-[87px] relative h-[43px]">
            <div className="absolute top-[26px] left-[calc(50%_-_43.5px)] font-extralight">
              Confirm seed
            </div>
            <div className="absolute top-[calc(50%_-_21.5px)] left-[calc(50%_-_43.5px)] rounded-[50%] bg-gray-500 w-[22px] h-[22px]" />
            <div className="absolute top-[calc(50%_-_19.5px)] left-[calc(50%_-_36.5px)] font-extralight text-white">
              3
            </div>
          </div>
        </div>
      </div>
      <form className="m-0 w-[428px] h-[389.9px] overflow-hidden shrink-0 flex flex-col items-center justify-center p-2.5 box-border">
        <div className="w-[322px] flex flex-row items-center justify-center p-2.5 box-border">
          <div className="relative text-[32px] font-medium font-body-small text-black text-left">
            Create a new wallet
          </div>
        </div>
        <div className="w-[345px] h-[97px] flex flex-col items-center justify-center gap-[10px]">
          <div className="relative text-sm tracking-[-0.02em] leading-[19px] font-body-small text-primary text-left">
            Select network type
          </div>
          <select
            className="self-stretch rounded-md bg-white flex flex-col items-start justify-start py-[13px] px-3 font-body text-base text-primary border-[1px] border-solid border-primary"
            required={true}
            value={wizardState.networkType}
            onChange={(e) => dispatch(wizardActions.setNetworkType(e.target.value))}
          >
            {/*<option value="Mainnet">Mainnet</option>*/}
            <option value="Testnet">Testnet</option>
            <option value="Regtest">Regtest</option>
          </select>
        </div>
        <div className="self-stretch flex flex-row items-center justify-center py-0 px-2.5 gap-[10px]">
          <input
            className="m-0 w-6 relative h-6"
            required={true}
            type="checkbox"
            checked={wizardState.confirmation}
            onChange={onConfirmationChange}
          />
          <div className="flex-1 relative text-xs tracking-[-0.02em] leading-[22px] font-body-small text-black text-left flex items-center h-[148px]">
            I confirm that nobody can see my screen and take responsibility of the security of this
            machine, because anyone who has access to my seed key will be able to spend the funds in
            my wallet.
          </div>
        </div>
      </form>
      <div className="self-stretch flex-1 flex flex-row items-start justify-center gap-[13px]">
        <button
          className="cursor-pointer [border:none] py-3 px-4 bg-dimgray-100 w-[114px] rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center box-border"
          onClick={onGoBackButtonClick}
        >
          <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body-small text-white text-left">
            GO BACK
          </div>
        </button>
        <button
          className={`cursor-pointer [border:none] py-3 px-4 bg-mediumslateblue-200 rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] w-[114px] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center box-border ${
            !wizardState.confirmation ? 'cursor-not-allowed opacity-50' : ''
          }`}
          onClick={onNextButtonClick}
          disabled={!wizardState.confirmation}
        >
          <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body text-white text-left">
            NEXT
          </div>
        </button>
      </div>
    </div>
  )
}

export default WalletWizardPage
