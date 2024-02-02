import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import { wizardActions } from "../store/wizard";
import { useDispatch, useSelector } from "react-redux";

const Popup = ({ message, onClose }) => (
  <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-gray-800 bg-opacity-50">
    <div className="bg-white p-4 rounded shadow-md">
      <p className="text-red-500">{message}</p>
      <button className="mt-2 px-4 py-2 bg-blue-500 text-white rounded" onClick={onClose}>
        Close
      </button>
    </div>
  </div>
);

const WalletWizardPage1 = () => {
  const dispatch = useDispatch();
  const wizardState = useSelector((state) => state.wizard);
  const wallets = useSelector((state) => state.wallet.wallets);
  const navigate = useNavigate();

  const [passwordError, setPasswordError] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  const validateConfirmPassword = () => wizardState.password === wizardState.confirmPassword;

  const onPasswordChange = (e) => {
    const newPassword = e.target.value;
    dispatch(wizardActions.setPassword(newPassword));
    setShowPopup(false);
  };

  const onConfirmPasswordChange = (e) => {
    const newConfirmPassword = e.target.value;
    dispatch(wizardActions.setConfirmPassword(newConfirmPassword));
    setConfirmPasswordError(!validateConfirmPassword());
    setShowPopup(false);
  };

  const onHelpButtonContainerClick = useCallback(() => navigate("/helpandsupportpage"), [navigate]);
  const onCogIconClick = useCallback(() => navigate("/settingspage"), [navigate]);
  const onLogoutButtonIconClick = useCallback(() => navigate("/"), [navigate]);
  const onGoBackButtonClick = useCallback(() => navigate("/new-wallet-0"), [navigate]);

  const onNextButtonClick = useCallback(() => {
    let errorMessage = '';

    if (!wizardState.termsConfirmation) {
      errorMessage = "Please confirm before proceeding.";
    } else if (wizardState.password !== wizardState.confirmPassword) {
      errorMessage = "Passwords do not match.";
    } else if (wallets.some(wallet => wallet.name === wizardState.walletName)) {
      errorMessage = "A wallet with the same name already exists. Please choose a different name.";
    } else if (wizardState.walletName === '') {
      errorMessage = 'Provide a wallet name.';
    }

    if (errorMessage) {
      setPopupMessage(errorMessage);
      setShowPopup(true);
    } else {
      navigate("/new-wallet-2");
    }
  }, [dispatch, navigate, wizardState, wallets]);

  const onTermsConfirmationChange = useCallback(() => {
    dispatch(wizardActions.setTermsConfirmation(!wizardState.termsConfirmation));
  }, [dispatch, wizardState]);

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
      <div className="self-stretch flex-1 flex flex-col items-center justify-center gap-[14px] text-black">
        <input
          className="[outline:none] font-body-small text-sm bg-[transparent] w-[318px] rounded box-border flex flex-row items-center justify-center p-2.5 text-silver-200 border-[1px] border-solid border-darkgray-200"
          placeholder="Wallet Name"
          type="text"
          value={wizardState.walletName}
          onChange={(e) => dispatch(wizardActions.setWalletName(e.target.value))}
        />
        <div className="w-[349px] flex flex-row items-center justify-center p-2.5 box-border">
          <div className="relative tracking-[-0.02em] leading-[19px]">
            <p className="m-0">
              Enter a password for your wallet. Leave blank for no
            </p>
            <p className="m-0">password.</p>
          </div>
        </div>
        <input
          className={`[outline:none] font-body-small text-sm bg-[transparent] w-[318px] rounded box-border flex flex-row items-center justify-center p-2.5 text-silver-200 border-[1px] border-solid border-darkgray-200 ${passwordError ? "border-red-500" : ""
            }`}
          placeholder="Password"
          type="password"
          value={wizardState.password}
          onChange={onPasswordChange}
        />
        {showPopup && (
          <Popup message={popupMessage} onClose={() => setShowPopup(false)} />
        )}
        <input
          className={`[outline:none] font-body-small text-sm bg-[transparent] w-[318px] rounded box-border flex flex-row items-center justify-center p-2.5 text-silver-200 border-[1px] border-solid border-darkgray-200 ${confirmPasswordError ? "border-red-500" : ""
            }`}
          placeholder="Confirm Password"
          type="password"
          value={wizardState.confirmPassword}
          onChange={onConfirmPasswordChange}
        />
        <div className="w-[332px] relative h-[94px] overflow-hidden shrink-0 text-xs">
          <div className="absolute top-[36px] left-[80px]">
            <span>{`I have read and agree to the `}</span>
            <span className="text-dodgerblue-200">Terms of Use.</span>
          </div>
          <input
            className="m-0 absolute top-[32px] left-[44px] w-6 h-6"
            type="checkbox"
            required={true}
            checked={wizardState.termsConfirmation}
            onChange={onTermsConfirmationChange}
          />
        </div>
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
          className={`cursor-pointer [border:none] py-3 px-4 bg-mediumslateblue-200 rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] w-[114px] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center box-border ${!wizardState.termsConfirmation ? "cursor-not-allowed opacity-50" : ""
            }`}
          onClick={onNextButtonClick}
          disabled={!wizardState.termsConfirmation}
        >
          <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body text-white text-left">
            NEXT
          </div>
        </button>
      </div>
    </div>
  );
};

export default WalletWizardPage1;
