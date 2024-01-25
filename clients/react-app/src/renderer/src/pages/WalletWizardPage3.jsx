import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import ConfirmSeedPanel from "../components/ConfirmSeedPanel";

import wizard, { wizardActions } from "../store/wizard";
import { walletActions } from '../store/wallet';
import wallet_manager from './../logic/walletManager';
import { useDispatch, useSelector } from "react-redux";


const WalletWizardPage3 = () => {
  const dispatch = useDispatch();
  const wizardState = useSelector((state) => state.wizard);

  const navigate = useNavigate();

  const onHelpButtonContainerClick = useCallback(() => {
    navigate("/helpandsupportpage");
  }, [navigate]);

  const onCogIconClick = useCallback(() => {
    navigate("/settingspage");
  }, [navigate]);

  const onGoBackButtonClick = useCallback(() => {
    navigate("/new-wallet-2");
  }, [navigate]);

  const onConfirmButtonClick = useCallback(async () => {
    // get values from the wizard state
    console.log('wallet name being passed is:', wizardState.walletName);
    // call the create wallet method with the state values

    let wallet = await wallet_manager.createWallet(wizardState.walletName, wizardState.mnemonic);

    // encrypt the wallet

    await dispatch(walletActions.createWallet(wallet));

    // wipe the wizard state clean
    await dispatch(wizardActions.setConfirmPassword(false));
    await dispatch(wizardActions.setTermsConfirmation(false));
    await dispatch(wizardActions.setPassword(''));
    await dispatch(wizardActions.setConfirmPassword(''));
    await dispatch(wizardActions.setWalletName(''));


    navigate("/wallet-main-1");
  }, [navigate, wizardState]);

  return (
    <div className="w-full relative bg-whitesmoke h-[926px] overflow-hidden flex flex-col items-center justify-start gap-[13px] text-left text-sm text-gray-300 font-body-small">
      <NavBar
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
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
            <div className="absolute top-[calc(50%_-_21.5px)] left-[calc(50%_-_37.5px)] rounded-[50%] bg-gray-500 w-[22px] h-[22px]" />
            <div className="absolute top-[calc(50%_-_19.5px)] left-[calc(50%_-_30.5px)] font-extralight text-white">
              2
            </div>
          </div>
          <div className="w-[87px] relative h-[43px]">
            <div className="absolute top-[26px] left-[calc(50%_-_43.5px)] font-extralight">
              Confirm seed
            </div>
            <div className="absolute top-[calc(50%_-_21.5px)] left-[calc(50%_-_43.5px)] rounded-[50%] bg-mediumslateblue-300 w-[22px] h-[22px]" />
            <div className="absolute top-[calc(50%_-_19.5px)] left-[calc(50%_-_36.5px)] font-extralight text-white">
              3
            </div>
          </div>
        </div>
      </div>
      <div className="self-stretch flex-1 flex flex-col items-center justify-center p-2.5">
        <div className="self-stretch flex-1 flex flex-row items-center justify-center p-2.5">
          <section className="w-[391px] relative text-sm font-bold font-body-small text-black text-left inline-block shrink-0">
            Click below or type in the missing words to confirm your seed key.
          </section>
        </div>
      </div>
      <div className="self-stretch rounded-sm h-[380px] overflow-hidden shrink-0 flex flex-row items-center justify-start p-2.5 box-border">
        {wizardState && wizardState.mnemonic && <ConfirmSeedPanel mnemonic={wizardState.mnemonic} />}
      </div>
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
          className="cursor-pointer [border:none] py-3 px-4 bg-mediumslateblue-200 w-[114px] rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center box-border"
          onClick={onConfirmButtonClick}
        >
          <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body-small text-white text-left">
            CONFIRM
          </div>
        </button>
      </div>
    </div>
  );
};

export default WalletWizardPage3;
