import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import SeedPhrasePanel from '../components/SeedPhrasePanel'
import { wizardActions } from '../store/wizard'
import wallet_manager from './../logic/walletManager'
import { useDispatch, useSelector } from 'react-redux'

const WalletWizardPage2 = () => {
  const dispatch = useDispatch()
  const wizardState = useSelector((state) => state.wizard)

  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      try {
        let mnemonic = await wallet_manager.createMnemonic()
        await dispatch(wizardActions.setMnemonic(mnemonic))
        console.log('created a key:', mnemonic)
      } catch (error) {
        // Handle any errors that might occur during the asynchronous operations
        console.error('Error:', error)
      }
    }

    fetchData()
  }, [dispatch])

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
    navigate('/new-wallet-1')
  }, [navigate])

  const onNextButtonClick = useCallback(() => {
    navigate('/new-wallet-3')
  }, [navigate])

  return (
    <div className="w-full relative bg-whitesmoke h-[926px] overflow-hidden flex flex-col items-center justify-start gap-[13px] text-left text-sm text-gray-300 font-body-small">
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
          <div className="w-[68px] relative h-[43px] text-gray-500">
            <div className="absolute top-[26px] left-[calc(50%_-_34px)] font-extralight">
              Wallet Info
            </div>
            <div className="absolute top-[0px] left-[calc(50%_-_34px)] rounded-[50%] bg-gray-500 w-[22px] h-[22px]" />
            <div className="absolute top-[2px] left-[calc(50%_-_26px)] font-extralight text-white">
              1
            </div>
          </div>
          <div className="w-[75px] relative h-[43px]">
            <div className="absolute top-[26px] left-[calc(50%_-_37.5px)] font-extralight">
              Wallet seed
            </div>
            <div className="absolute top-[calc(50%_-_21.5px)] left-[calc(50%_-_37.5px)] rounded-[50%] bg-mediumslateblue-300 w-[22px] h-[22px]" />
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
      <div className="self-stretch flex-1 flex flex-col items-center justify-center p-2.5">
        <div className="self-stretch flex-1 flex flex-row items-center justify-center p-2.5">
          <section className="w-[391px] relative text-sm text-black text-left inline-block shrink-0 font-body-small">
            <p className="m-0">{`The list of 12 words below is the recovery seed key for the wallet you are creating. `}</p>
            <p className="m-0">
              <b>&nbsp;</b>
            </p>
            <p className="m-0">
              <b>
                Carefully write down and store your seed somewhere safe, as it provides access to
                your wallet.
              </b>
            </p>
            <p className="m-0">&nbsp;</p>
            <p className="m-0">
              For best practice, never store it online or on the same computer as the wallet. The
              seed key is the only way to recover your wallet if your computer is lost, stolen or
              stops working. There is no way to recover the seed if lost.
            </p>
          </section>
        </div>
      </div>
      <div
        className="self-stretch rounded-sm h-[380px] overflow-hidden shrink-0 flex flex-row items-center justify-start p-2.5 box-border"
        data-cy="seed-phrase-panel"
      >
        {wizardState && wizardState.mnemonic && <SeedPhrasePanel mnemonic={wizardState.mnemonic} />}
      </div>
      <div className="self-stretch flex-1 flex flex-row items-start justify-center gap-[13px]">
        <button
          className="cursor-pointer [border:none] py-3 px-4 bg-dimgray-100 w-[114px] rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center box-border"
          onClick={onGoBackButtonClick}
          data-cy="go-back-button"
        >
          <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body-small text-white text-left">
            GO BACK
          </div>
        </button>
        <button
          className="cursor-pointer [border:none] py-3 px-4 bg-mediumslateblue-200 w-[114px] rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center box-border"
          onClick={onNextButtonClick}
          data-cy="next-button"
        >
          <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body-small text-white text-left">
            NEXT
          </div>
        </button>
      </div>
    </div>
  )
}

export default WalletWizardPage2
