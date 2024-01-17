import { useMemo } from "react";

const NavBar = ({
  propCursor,
  onNavNavMenuClick,
  onHelpButtonContainerClick,
  onCogIconClick,
  onLogoutButtonIconClick,
  loggedIn,
}) => {
  const navNavMenuStyle = useMemo(() => {
    return {
      cursor: propCursor,
    };
  }, [propCursor]);

  return (
    <header className="absolute w-full top-[0px] right-[0px] left-[0px] bg-royalblue-200 flex flex-row items-center justify-between py-2 px-6 box-border">
      <div className="relative w-[119px] h-[48.1px]">
        <img
          className="absolute h-full w-full top-[0%] right-[0%] bottom-[0%] left-[0%] max-w-full overflow-hidden max-h-full object-cover"
          alt=""
          src="/monochrome--white4x-2@2x.png"
        />
      </div>
      <div
        className="shrink-0 flex flex-row items-center justify-center gap-[16px]"
        style={navNavMenuStyle}
        onClick={onNavNavMenuClick}
      >
        <div
          className="relative w-[17px] h-[17px] cursor-pointer"
          onClick={onHelpButtonContainerClick}
        >
          <div className="absolute h-full w-full top-[0%] right-[0%] bottom-[0%] left-[0%] rounded-12xs bg-white" />
          <img
            className="absolute h-[88.24%] w-[88.24%] top-[5.88%] right-[5.88%] bottom-[5.88%] left-[5.88%] max-w-full overflow-hidden max-h-full object-cover"
            alt=""
            src="/question-mark-fill0-wght400-grad0-opsz24-1@2x.png"
          />
        </div>
        <div className="relative w-[58px] h-6">
          <div className="absolute top-[0px] left-[0px] w-6 h-6 overflow-hidden">
            <img
              className="absolute h-3/4 w-9/12 top-[12.5%] right-[12.5%] bottom-[12.5%] left-[12.5%] max-w-full overflow-hidden max-h-full cursor-pointer"
              alt=""
              src="/icon.svg"
              onClick={onCogIconClick}
            />
          </div>
          {loggedIn && (
            <img
              className="absolute top-[4px] left-[40px] w-[18px] h-4 object-cover cursor-pointer"
              alt=""
              src="/logoutbutton@2x.png"
              onClick={onLogoutButtonIconClick}
            />
          )}
        </div>
      </div>
    </header>
  );
};

export default NavBar;
