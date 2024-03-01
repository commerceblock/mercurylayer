import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import WalletSeedContainer from "../components/WalletSeedContainer";
import NavBar from "../components/NavBar";

const SeedPage = () => {
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

  const onGoBackButtonClick = useCallback(() => {
    navigate("/new-wallet-2-create-password");
  }, [navigate]);

  const onNextButtonClick = useCallback(() => {
    navigate("/new-wallet-4-finalize-seed");
  }, [navigate]);

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
        onClick={onNextButtonClick}
      >
        <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body text-white text-left">
          NEXT
        </div>
      </button>
      <WalletSeedContainer />
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

export default SeedPage;
