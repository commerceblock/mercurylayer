import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import ConfirmSeedContainer from "../components/ConfirmSeedContainer";
import { useDispatch, useSelector } from "react-redux";
import wizard, { wizardActions } from "../store/wizard";
import wallet_manager from './../logic/walletManager';
import { walletActions } from "../store/wallet";

const ConfirmSeedPage = () => {
  const wizardState = useSelector((state) => state.wizard);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const onHelpButtonContainerClick = useCallback(() => {
    navigate("/helpandsupportpage");
  }, [navigate]);

  const onCogIconClick = useCallback(() => {
    navigate("/settingspage");
  }, [navigate]);

  const onLogoutButtonIconClick = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const onGoBackButtonClick = useCallback(() => {
    navigate("/new-wallet-3-wallet-seed");
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


    navigate("/mainpage");
  }, [navigate, wizardState]);

  return (
    <div className="relative bg-whitesmoke w-full h-[926px] overflow-hidden">
      <button
        className="cursor-pointer [border:none] py-3 px-4 bg-dimgray-100 absolute top-[calc(50%_+_214px)] left-[calc(50%_-_56px)] rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] w-[114px] h-[30px] overflow-hidden flex flex-row items-center justify-center box-border"
        onClick={onGoBackButtonClick}
      >
        <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body text-white text-left">
          GO BACK
        </div>
      </button>
      <button
        className="cursor-pointer [border:none] py-3 px-4 bg-mediumslateblue-200 absolute top-[calc(50%_+_214px)] left-[calc(50%_+_71px)] rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] w-[114px] h-[30px] overflow-hidden flex flex-row items-center justify-center box-border"
        onClick={onConfirmButtonClick}
      >
        <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body text-white text-left">
          CONFIRM
        </div>
      </button>
      <ConfirmSeedContainer />
      <NavBar
        propCursor="unset"
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        loggedIn
      />
    </div>
  );
};

export default ConfirmSeedPage;
