import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { wizardActions } from "../store/wizard";

const CreatePasswordContainer = () => {
  const dispatch = useDispatch();
  const wizardState = useSelector((state) => state.wizard);

  const navigate = useNavigate();

  const onGoBackButtonClick = useCallback(() => {
    navigate("/newwalletpage");
  }, [navigate]);

  const onNextButtonClick = useCallback(() => {
    if (wizardState.termsConfirmation) {
      navigate("/new-wallet-3-wallet-seed");
    } else {
      console.warn("Please confirm before proceeding.");
    }

  }, [dispatch, navigate, wizardState]);

  const onTermsConfirmationChange = useCallback(() => {
    // Dispatch action to update the confirmation state
    dispatch(wizardActions.setTermsConfirmation(!wizardState.termsConfirmation));
  }, [dispatch, wizardState]);

  return (
    <div className="absolute w-[calc(100%_-_60px)] top-[110px] right-[23px] left-[37px] flex flex-col items-center justify-center gap-[14px] text-left text-sm text-black font-body">
      <div className="w-[368px] flex flex-row items-center justify-center gap-[48px] text-gray-200">
        <div className="relative w-[110px] h-[43px] text-mediumslateblue-300">
          <div className="absolute top-[26px] left-[calc(50%_-_55px)] font-extralight">
            Create Password
          </div>
          <div className="absolute top-[0px] left-[calc(50%_-_55px)] rounded-[50%] bg-mediumslateblue-300 w-[22px] h-[22px]" />
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
        <div className="relative w-[87px] h-[43px]">
          <div className="absolute top-[26px] left-[calc(50%_-_43.5px)] font-extralight">
            Confirm seed
          </div>
          <div className="absolute top-[calc(50%_-_21.5px)] left-[calc(50%_-_43.5px)] rounded-[50%] bg-gray-400 w-[22px] h-[22px]" />
          <div className="absolute top-[calc(50%_-_19.5px)] left-[calc(50%_-_36.5px)] font-extralight text-white">
            3
          </div>
        </div>
      </div>
      <input
        className="[outline:none] font-body text-sm bg-[transparent] rounded box-border w-[318px] flex flex-row items-center justify-center p-2.5 text-silver-200 border-[1px] border-solid border-darkgray"
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
        className="[outline:none] font-body text-sm bg-[transparent] rounded box-border w-[318px] flex flex-row items-center justify-center p-2.5 text-silver-200 border-[1px] border-solid border-darkgray"
        placeholder="Password (min 8 characters)"
        type="text"
        value={wizardState.password}
        onChange={(e) => dispatch(wizardActions.setPassword(e.target.value))}
        multiple
      />
      <input
        className="[outline:none] font-body text-sm bg-[transparent] rounded box-border w-[318px] flex flex-row items-center justify-center p-2.5 text-silver-200 border-[1px] border-solid border-darkgray"
        placeholder="Confirm Password"
        type="text"
        value={wizardState.confirmPassword}
        onChange={(e) => dispatch(wizardActions.setConfirmPassword(e.target.value))}
      />
      <div className="relative w-[332px] h-[94px] overflow-hidden shrink-0 text-xs">
        <div className="absolute top-[36px] left-[80px]">
          <span>{`I have read and agree to the `}</span>
          <span className="text-dodgerblue-200">Terms of Use.</span>
        </div>
        <input
          className="m-0 absolute top-[32px] left-[44px] w-6 h-6"
          required={true}
          type="checkbox"
          checked={wizardState.termsConfirmation}
          onChange={onTermsConfirmationChange}
        />
      </div>
      <div className="flex flex-row items-center justify-center gap-[14px]">
        <button
          className="cursor-pointer [border:none] py-3 px-4 bg-dimgray-100 rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] w-[114px] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center box-border"
          onClick={onGoBackButtonClick}
        >
          <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body text-white text-left">
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

export default CreatePasswordContainer;
