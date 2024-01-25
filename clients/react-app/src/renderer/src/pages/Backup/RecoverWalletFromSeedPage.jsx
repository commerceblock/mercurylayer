import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";

const RecoverWalletFromSeedPage = () => {
  const [textInputValue, setTextInputValue] = useState("");
  const [textInput1Value, setTextInput1Value] = useState("");
  const [textInput2Value, setTextInput2Value] = useState("");
  const [textInput3Value, setTextInput3Value] = useState("");
  const [textInput4Value, setTextInput4Value] = useState("");
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

  const onConfirmButtonContainerClick = useCallback(() => {
    navigate("/mainpage");
  }, [navigate]);

  const onGoBackButtonClick = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const onStateOffContainerClick = useCallback(() => {
    navigate("/recoverwalletfrombackuppage");
  }, [navigate]);

  return (
    <div className="relative bg-whitesmoke w-full h-[926px] overflow-hidden text-left text-sm text-primary font-body">
      <div
        className="absolute top-[calc(50%_+_341px)] left-[calc(50%_+_50px)] rounded-md bg-mediumslateblue-200 shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] w-[114px] h-[30px] overflow-hidden flex flex-row items-center justify-center py-3 px-4 box-border cursor-pointer text-base text-white"
        onClick={onConfirmButtonContainerClick}
      >
        <div className="relative tracking-[-0.02em] leading-[22px] font-semibold">
          CONFIRM
        </div>
      </div>
      <button
        className="cursor-pointer [border:none] py-3 px-4 bg-dimgray-100 absolute top-[calc(50%_+_340px)] left-[calc(50%_-_84px)] rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] w-[114px] h-[30px] overflow-hidden flex flex-row items-center justify-center box-border"
        onClick={onGoBackButtonClick}
      >
        <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body text-white text-left">
          GO BACK
        </div>
      </button>
      <div className="absolute top-[calc(50%_+_194px)] left-[calc(50%_-_173px)] w-[345px] h-[92px] overflow-hidden text-xs text-black">
        <div className="absolute top-[36px] left-[80px]">
          <span>{`I have read and agree to the `}</span>
          <span className="text-dodgerblue-200">Terms of Use.</span>
        </div>
        <input
          className="m-0 absolute top-[31px] left-[44px] w-6 h-6"
          type="checkbox"
        />
      </div>
      <div className="absolute top-[calc(50%_+_127px)] left-[calc(50%_-_173px)] w-[345px] flex flex-col items-start justify-end gap-[7px]">
        <div className="relative tracking-[-0.02em] leading-[19px] hidden">
          <p className="m-0">
            Enter a password for your wallet. Leave blank for no
          </p>
          <p className="m-0">password.</p>
        </div>
        <input
          className="[outline:none] font-body text-base bg-white self-stretch rounded-md box-border h-12 flex flex-row items-start justify-start p-3 text-secondary border-[1px] border-solid border-primary"
          placeholder="Confirm password"
          type="text"
          value={textInputValue}
          onChange={(event) => setTextInputValue(event.target.value)}
        />
      </div>
      <div className="absolute top-[calc(50%_+_14px)] left-[calc(50%_-_173px)] w-[345px] flex flex-col items-start justify-end gap-[7px]">
        <div className="relative tracking-[-0.02em] leading-[19px]">
          <p className="m-0">
            Enter a password for your wallet. Leave blank for no
          </p>
          <p className="m-0">password.</p>
        </div>
        <input
          className="[outline:none] font-body text-base bg-white self-stretch rounded-md box-border h-12 flex flex-row items-start justify-start p-3 text-secondary border-[1px] border-solid border-primary"
          placeholder="Password (min 8 characters)"
          type="text"
          value={textInput1Value}
          onChange={(event) => setTextInput1Value(event.target.value)}
        />
      </div>
      <div className="absolute top-[calc(50%_-_66px)] left-[calc(50%_-_173px)] w-[345px] h-[50px] flex flex-col items-start justify-end gap-[7px]">
        <div className="relative tracking-[-0.02em] leading-[19px]" />
        <input
          className="[outline:none] font-body text-base bg-white self-stretch rounded-md box-border h-12 flex flex-row items-start justify-start p-3 text-secondary border-[1px] border-solid border-primary"
          placeholder="Wallet name"
          type="text"
          value={textInput2Value}
          onChange={(event) => setTextInput2Value(event.target.value)}
        />
      </div>
      <div className="absolute top-[calc(50%_-_179px)] left-[calc(50%_-_173px)] w-[345px] flex flex-col items-start justify-end gap-[7px]">
        <div className="relative tracking-[-0.02em] leading-[19px]">
          <p className="m-0">{`Enter the number of derived addresses to query. `}</p>
          <p className="m-0">
            This is the highest address index previously used.
          </p>
        </div>
        <input
          className="[outline:none] font-body text-base bg-white self-stretch rounded-md box-border h-12 flex flex-row items-start justify-start p-3 text-secondary border-[1px] border-solid border-primary"
          placeholder="Address gap limit"
          type="number"
          value={textInput3Value}
          onChange={(event) => setTextInput3Value(event.target.value)}
        />
      </div>
      <div className="absolute top-[calc(50%_-_258px)] left-[calc(50%_-_173px)] w-[345px] h-[49px] flex flex-col items-start justify-end gap-[7px]">
        <div className="relative tracking-[-0.02em] leading-[19px]" />
        <input
          className="[outline:none] font-body text-base bg-white self-stretch rounded-md box-border h-12 flex flex-row items-start justify-start p-3 text-secondary border-[1px] border-solid border-primary"
          placeholder="Mnemonic"
          type="text"
          value={textInput4Value}
          onChange={(event) => setTextInput4Value(event.target.value)}
        />
      </div>
      <div className="absolute w-full top-[calc(50%_-_373px)] right-[0px] left-[0px] rounded-8xs overflow-hidden flex flex-row items-center justify-center py-7 px-0 box-border text-center text-base">
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

export default RecoverWalletFromSeedPage;
