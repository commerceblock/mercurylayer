import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";

const RecoverWalletFromBackupPage = () => {
  const [textInputValue, setTextInputValue] = useState("");
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

  const onSelectBackupFileButtonClick = useCallback((e) => {
    wasm.loadBackupFile();
  }, []);

  const onStateOnContainerClick = useCallback(() => {
    navigate("/recoverwalletfromseedpage");
  }, [navigate]);

  return (
    <div className="relative bg-whitesmoke w-full h-[926px] overflow-hidden text-left text-sm text-primary font-body">
      <button
        className="cursor-pointer [border:none] py-3 px-4 bg-mediumslateblue-200 absolute top-[calc(50%_-_182px)] left-[calc(50%_-_116px)] rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] w-[247px] h-[55px] overflow-hidden flex flex-row items-center justify-center box-border"
        onClick={onSelectBackupFileButtonClick}
      >
        <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body text-white text-left">
          SELECT YOUR BACKUP FILE
        </div>
      </button>
      <div className="absolute top-[calc(50%_-_249px)] left-[calc(50%_-_173px)] w-[345px] flex flex-col items-start justify-end gap-[7px]">
        <div className="relative tracking-[-0.02em] leading-[19px] hidden">
          <p className="m-0">
            Enter a password for your wallet. Leave blank for no
          </p>
          <p className="m-0">password.</p>
        </div>
        <input
          className="[outline:none] font-body text-base bg-white self-stretch rounded-md box-border h-12 flex flex-row items-start justify-start p-3 text-secondary border-[1px] border-solid border-primary"
          placeholder="Password"
          type="password"
          value={textInputValue}
          onChange={(event) => setTextInputValue(event.target.value)}
        />
      </div>
      <div className="absolute w-full top-[90px] right-[0px] left-[0px] rounded-8xs overflow-hidden flex flex-row items-center justify-center py-7 px-0 box-border text-center text-base">
        <div
          className="flex-1 relative bg-white box-border h-[47px] overflow-hidden cursor-pointer border-b-[1px] border-solid border-tertiary"
          onClick={onStateOnContainerClick}
        >
          <div className="absolute w-full top-[calc(50%_-_11.5px)] left-[0px] tracking-[-0.02em] leading-[22px] inline-block h-11">
            Restore from Seed
          </div>
        </div>
        <div className="flex-1 relative bg-white box-border h-12 overflow-hidden border-b-[2px] border-solid border-royalblue-100">
          <div className="absolute w-full top-[calc(50%_-_12px)] left-[0px] tracking-[-0.02em] leading-[22px] font-semibold inline-block">
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

export default RecoverWalletFromBackupPage;
