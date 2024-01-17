import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { useDispatch, useSelector } from "react-redux";
import wizard, { wizardActions } from "../store/wizard";
import wallet_manager from './../logic/walletManager';
import { walletActions } from "../store/wallet";

const ConfirmSeedPage = () => {
  const dispatch = useDispatch();
  const wizardState = useSelector((state) => state.wizard);

  const navigate = useNavigate();

  const onHelpButtonContainerClick = useCallback(() => {
    navigate("/helpandsupportpage");
  }, [navigate]);

  const onCogIconClick = useCallback(() => {
    navigate("/settingspage");
  }, [navigate]);

  const onLogoutButtonIconClick = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const onBackButtonClick = useCallback(() => {
    navigate("/new-wallet-2-create-password");
  }, [navigate]);

  const onConfirmButtonClick = useCallback(async () => {
    // get values from the wizard state
    console.log('wallet name being passed is:', wizardState.walletName);
    // call the create wallet method with the state values
    let wallet = await wallet_manager.createWallet(wizardState.walletName);

    await dispatch(walletActions.createWallet(wallet));

    // wipe the wizard state clean
    /*
    await dispatch(wizardActions.setConfirmPassword(false));
    await dispatch(wizardActions.setTermsConfirmation(false));
    await dispatch(wizardActions.setPassword(''));
    await dispatch(wizardActions.setConfirmPassword(''));
    await dispatch(wizardActions.setWalletName(''));*/


    navigate("/mainpage");
  }, [navigate, wizardState]);

  return (
    <div className="relative bg-whitesmoke w-full h-[926px] overflow-hidden text-left text-sm text-gray-400 font-body">
      <button
        className="cursor-pointer [border:none] py-3 px-4 bg-dimgray-100 absolute top-[calc(50%_+_214px)] left-[calc(50%_-_56px)] rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] w-[114px] h-[30px] overflow-hidden flex flex-row items-center justify-center box-border"
        onClick={onBackButtonClick}
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
      <div className="absolute w-[calc(100%_-_60px)] top-[110px] right-[23px] left-[37px] flex flex-row items-center justify-center gap-[48px]">
        <div className="relative w-[110px] h-[43px]">
          <div className="absolute top-[26px] left-[calc(50%_-_55px)] font-extralight">
            Create Password
          </div>
          <div className="absolute top-[0px] left-[calc(50%_-_55px)] rounded-[50%] bg-gray-400 w-[22px] h-[22px]" />
          <div className="absolute top-[2px] left-[calc(50%_-_47px)] font-extralight text-white">
            1
          </div>
        </div>
        <div className="relative w-[75px] h-[43px]">
          <div className="absolute top-[26px] left-[calc(50%_-_37.5px)] font-extralight">
            Wallet seed
          </div>
          <div className="absolute top-[calc(50%_-_21.5px)] left-[calc(50%_-_37.5px)] rounded-[50%] bg-gray-400 w-[22px] h-[22px]" />
          <div className="absolute top-[calc(50%_-_19.5px)] left-[calc(50%_-_30.5px)] font-extralight text-white">
            2
          </div>
        </div>
        <div className="relative w-[87px] h-[43px] text-mediumslateblue-300">
          <div className="absolute top-[26px] left-[calc(50%_-_43.5px)] font-extralight">
            Confirm seed
          </div>
          <div className="absolute top-[calc(50%_-_21.5px)] left-[calc(50%_-_43.5px)] rounded-[50%] bg-mediumslateblue-300 w-[22px] h-[22px]" />
          <div className="absolute top-[calc(50%_-_19.5px)] left-[calc(50%_-_36.5px)] font-extralight text-white">
            3
          </div>
        </div>
      </div>
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
