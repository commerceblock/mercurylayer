import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useLoggedInWallet } from "../hooks/walletHooks";
import { walletActions } from "../store/wallet";

import logo from "../../resources/logo.png?asset&asarUnpack";
import logoutImg from "../../resources/logout_button.svg?asset&asarUnpack";
import settingsImg from "../../resources/settings_icon.svg?asset&asarUnpack";
import helpImg from "../../resources/help_icon.svg?asset&asarUnpack";

const NavBar = ({
  onNavNavMenuClick,
  onHelpButtonContainerClick,
  onCogIconClick,
  showLogoutButton,
  showSettingsButton,
  showHelpButton,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loggedInWallet = useLoggedInWallet();

  const onLogoutButtonIconClick = () => {
    console.log("Log out button was called");
    // clear the logged in wallet
    dispatch(walletActions.clearLoggedInWallet());
    navigate("/");
  };

  return (
    <header className="shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] self-stretch bg-royalblue-200 flex flex-row items-center justify-between py-2 px-6">
      <img
        className="w-[119px] relative h-[48.1px] object-cover"
        alt=""
        src={logo}
      />
      <div
        className="flex flex-row items-center justify-center gap-[16px]"
        onClick={onNavNavMenuClick}
      >
        {showHelpButton && (
          <div
            className="w-[17px] relative h-[17px] cursor-pointer"
            onClick={onHelpButtonContainerClick}
          >
            <div className="absolute h-full w-full top-[0%] right-[0%] bottom-[0%] left-[0%] rounded-12xs bg-white" />
            <img
              className="absolute h-[88.24%] w-[88.24%] top-[5.88%] right-[5.88%] bottom-[5.88%] left-[5.88%] max-w-full overflow-hidden max-h-full"
              alt=""
              src={helpImg}
            />
          </div>
        )}
        <div className="w-[58px] relative h-6">
          {showSettingsButton && (
            <div className="absolute top-[0px] left-[0px] w-6 h-6 overflow-hidden">
              <img
                className="absolute h-3/4 w-9/12 top-[12.5%] right-[12.5%] bottom-[12.5%] left-[12.5%] max-w-full overflow-hidden max-h-full cursor-pointer"
                alt=""
                src={settingsImg}
                onClick={onCogIconClick}
              />
            </div>
          )}
          {showLogoutButton && (
            <img
              className="absolute top-[4px] left-[40px] w-[18px] h-4 cursor-pointer"
              alt=""
              src={logoutImg}
              onClick={onLogoutButtonIconClick}
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default NavBar;
