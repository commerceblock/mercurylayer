import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { wizardActions } from "../store/wizard";

const NewWalletContainer = () => {
  const dispatch = useDispatch();
  const wizardState = useSelector((state) => state.wizard);
  const navigate = useNavigate();

  const onConfirmationChange = useCallback(() => {
    // Dispatch action to update the confirmation state
    dispatch(wizardActions.setConfirmation(!wizardState.confirmation));
  }, [dispatch, wizardState]);

  const onGoBackButtonContainerClick = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const onNextButtonClick = useCallback(() => {
    // Check if the confirmation is pressed before navigating
    if (wizardState.confirmation) {
      navigate("/new-wallet-2-create-password");
    } else {
      console.warn("Please confirm before proceeding.");
    }
  }, [dispatch, navigate, wizardState]);

  return (
    <form className="m-0 absolute w-full top-[64.1px] right-[0px] left-[0px] h-[478.9px] flex flex-col items-center justify-center">
      <div className="w-[345px] flex flex-col items-center justify-center gap-[7px]">
        <div className="relative text-sm tracking-[-0.02em] leading-[19px] font-body text-primary text-left">
          Select network type
        </div>
        <select
          className="self-stretch rounded-md bg-white flex flex-col items-start justify-start py-[13px] px-3 font-body text-base text-primary border-[1px] border-solid border-primary"
          required={true}
          value={wizardState.networkType}
          onChange={(e) => dispatch(wizardActions.setNetworkType(e.target.value))}
        >
          <option value="Mainnet">Mainnet</option>
          <option value="Testnet">Testnet</option>
          <option value="Regtest">Regtest</option>
        </select>
      </div>
      <div className="w-[322px] flex flex-row items-center justify-center p-2.5 box-border">
        <div className="relative text-13xl font-medium font-body text-black text-left">
          Create a new wallet
        </div>
      </div>
      <div className="w-[408px] flex flex-row items-center justify-center p-2.5 box-border">
        <p
          className="m-0 relative text-sm tracking-[-0.02em] leading-[19px] font-body text-red text-left flex items-center w-[388px] shrink-0"
          id="testnet_text"
          showing="false"
        >
          IMPORTANT: Wallet was opened in testnet, therefore new wallets will be
          created in testnet. Existing wallets are not changed.
        </p>
      </div>
      <div className="w-[404px] flex flex-row items-center justify-center gap-[21px]">
        <input
          className="m-0 relative w-6 h-6"
          required={true}
          type="checkbox"
          checked={wizardState.confirmation}
          onChange={onConfirmationChange}
        />
        <div className="relative text-xs tracking-[-0.02em] leading-[22px] font-body text-black text-left flex items-center w-[359px] h-[148px] shrink-0">
          I confirm that nobody can see my screen and take responsibility of the
          security of this machine, because anyone who has access to my seed key
          will be able to spend the funds in my wallet.
        </div>
      </div>
      <div className="self-stretch h-[60px] flex flex-row items-center justify-center gap-[21px]">
        <div
          className="rounded-md bg-dimgray-100 shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] w-[114px] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center py-3 px-4 box-border cursor-pointer"
          onClick={onGoBackButtonContainerClick}
        >
          <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body text-white text-left">
            GO BACK
          </div>
        </div>
        <button
          className={`cursor-pointer [border:none] py-3 px-4 bg-mediumslateblue-200 rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] w-[114px] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center box-border ${!wizardState.confirmation ? "cursor-not-allowed opacity-50" : ""
            }`}
          onClick={onNextButtonClick}
          disabled={!wizardState.confirmation}
        >
          <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body text-white text-left">
            NEXT
          </div>
        </button>
      </div>
    </form>
  );
};

export default NewWalletContainer;
