import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'

const RecoverWalletFromSeedPage = () => {
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

  const onStateOffContainerClick = useCallback(() => {
    navigate('/recoverwalletfrombackuppage')
  }, [navigate])

  const onGoBackButtonClick = useCallback(() => {
    navigate('/')
  }, [navigate])

  const onConfirmButtonClick = useCallback(() => {
    navigate('/mainpage')
  }, [navigate])

  return (
    <div className="w-full relative bg-whitesmoke h-[926px] overflow-hidden flex flex-col items-center justify-start gap-[20px] text-center text-base text-primary font-body-small">
      <NavBar
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        showLogoutButton={false}
        showSettingsButton={false}
        showHelpButton={false}
      />
      <div className="self-stretch rounded-8xs overflow-hidden flex flex-row items-center justify-center py-7 px-0">
        <div className="flex-1 relative bg-white box-border h-12 overflow-hidden border-b-[2px] border-solid border-dodgerblue-100">
          <div className="absolute w-full top-[calc(50%_-_12px)] left-[0px] tracking-[-0.02em] leading-[22px] font-semibold inline-block">
            Restore from Seed
          </div>
        </div>
        <div
          className="flex-1 relative bg-white box-border h-[47px] overflow-hidden cursor-pointer border-b-[1px] border-solid border-tertiary"
          onClick={onStateOffContainerClick}
        >
          <div className="absolute w-full top-[calc(50%_-_11.5px)] left-[0px] tracking-[-0.02em] leading-[22px] inline-block h-11">
            Restore from Backup
          </div>
        </div>
      </div>
      {/*

      <div className="w-[345px] relative h-[525px] text-left text-sm">
        <div className="absolute top-[0px] left-[0px] w-[345px] h-[49px] flex flex-col items-start justify-end gap-[7px]">
          <div className="relative tracking-[-0.02em] leading-[19px]" />
          <input
            className="[outline:none] font-body-small text-base bg-white self-stretch rounded-md box-border h-12 flex flex-row items-start justify-start p-3 text-darkgray-300 border-[1px] border-solid border-primary"
            placeholder="Mnemonic"
            type="text"
          />
        </div>
        <div className="absolute top-[69px] left-[0px] w-[345px] flex flex-col items-start justify-end gap-[7px]">
          <div className="relative tracking-[-0.02em] leading-[19px]">
            <p className="m-0">{`Enter the number of derived addresses to query. `}</p>
            <p className="m-0">
              This is the highest address index previously used.
            </p>
          </div>
          <input
            className="[outline:none] font-body-small text-base bg-white self-stretch rounded-md box-border h-12 flex flex-row items-start justify-start p-3 text-darkgray-300 border-[1px] border-solid border-primary"
            placeholder="Address gap limit"
            type="number"
          />
        </div>
        <div className="absolute top-[182px] left-[0px] w-[345px] h-[50px] flex flex-col items-start justify-end gap-[7px]">
          <div className="relative tracking-[-0.02em] leading-[19px]" />
          <input
            className="[outline:none] font-body-small text-base bg-white self-stretch rounded-md box-border h-12 flex flex-row items-start justify-start p-3 text-darkgray-300 border-[1px] border-solid border-primary"
            placeholder="Wallet name"
            type="text"
          />
        </div>
        <div className="absolute top-[252px] left-[0px] w-[345px] flex flex-col items-start justify-end gap-[7px]">
          <div className="relative tracking-[-0.02em] leading-[19px]">
            <p className="m-0">
              Enter a password for your wallet. Leave blank for no
            </p>
            <p className="m-0">password.</p>
          </div>
          <input
            className="[outline:none] font-body-small text-base bg-white self-stretch rounded-md box-border h-12 flex flex-row items-start justify-start p-3 text-darkgray-300 border-[1px] border-solid border-primary"
            placeholder="Password (min 8 characters)"
            type="text"
          />
        </div>
        <div className="absolute top-[365px] left-[0px] w-[345px] flex flex-col items-start justify-end gap-[7px]">
          <div className="w-[329px] relative tracking-[-0.02em] leading-[19px] hidden">
            <p className="m-0">
              Enter a password for your wallet. Leave blank for no
            </p>
            <p className="m-0">password.</p>
          </div>
          <input
            className="[outline:none] font-body-small text-base bg-white self-stretch rounded-md box-border h-12 flex flex-row items-start justify-start p-3 text-darkgray-300 border-[1px] border-solid border-primary"
            placeholder="Confirm password"
            type="text"
          />
        </div>
        <div className="absolute top-[433px] left-[0px] w-[345px] h-[92px] overflow-hidden text-xs text-black">
          <div className="absolute top-[36px] left-[80px]">
            <span>{`I have read and agree to the `}</span>
            <span className="text-dodgerblue-200">Terms of Use.</span>
          </div>
          <input
            className="m-0 absolute top-[31px] left-[44px] w-6 h-6"
            type="checkbox"
          />
        </div>
      </div>
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
          onClick={onConfirmButtonClick}
        >
          <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body-small text-white text-left">
            CONFIRM
          </div>
        </button>
      </div>

        */}
    </div>
  )
}

export default RecoverWalletFromSeedPage
