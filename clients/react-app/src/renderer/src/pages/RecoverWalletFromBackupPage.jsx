import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";

const RecoverWalletFromBackupPage = () => {
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

  const onStateOnContainerClick = useCallback(() => {
    navigate("/recoverwalletfromseedpage");
  }, [navigate]);

  const onSelectBackupFileButtonClick = useCallback(() => {
    navigate("/wallet-main-1");
  }, [navigate]);

  return (
    <div className="w-full relative bg-whitesmoke h-[926px] overflow-hidden flex flex-col items-center justify-start gap-[22px] text-center text-base text-primary font-body-small">
      <NavBar
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        showLogoutButton={false}
        showSettingsButton={false}
        showHelpButton={false}
      />
      <div className="self-stretch rounded-8xs overflow-hidden flex flex-row items-center justify-center py-7 px-0">
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
      <div className="self-stretch flex-1 flex flex-col items-center justify-start gap-[22px] text-left text-sm">
        <div className="w-[345px] flex flex-col items-start justify-end gap-[7px]">
          <div className="relative tracking-[-0.02em] leading-[19px]" />
          <input
            className="[outline:none] font-body-small text-base bg-white self-stretch rounded-md box-border h-12 flex flex-row items-start justify-start p-3 text-darkgray-300 border-[1px] border-solid border-primary"
            placeholder="Password"
            type="password"
          />
        </div>
        <button
          className="cursor-pointer [border:none] py-3 px-4 bg-mediumslateblue-200 w-[247px] rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-[55px] overflow-hidden shrink-0 flex flex-row items-center justify-center box-border"
          onClick={onSelectBackupFileButtonClick}
        >
          <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body-small text-white text-left">
            SELECT YOUR BACKUP FILE
          </div>
        </button>
      </div>
    </div>
  );
};

export default RecoverWalletFromBackupPage;
