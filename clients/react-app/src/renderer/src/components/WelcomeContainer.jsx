import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

const WelcomeContainer = () => {
  const navigate = useNavigate();

  const onNewWalletButtonClick = useCallback(() => {
    navigate("/newwalletpage");
  }, [navigate]);

  const onLoadWalletButtonContainerClick = useCallback(() => {
    navigate("/loadwalletpage");
  }, [navigate]);

  const onRecoverWalletButtonClick = useCallback(() => {
    navigate("/recoverwalletfromseedpage");
  }, [navigate]);

  return (
    <div className="absolute w-[calc(100%_-_49px)] top-[109px] right-[24px] left-[25px] h-[392px] flex flex-col items-center justify-center gap-[32px] text-left text-7xl-4 text-black font-body">
      <div className="w-[278px] flex flex-row items-center justify-between p-2.5 box-border">
        <div className="relative">Welcome to Mercury</div>
      </div>
      <div className="w-[379px] h-[147px] flex flex-row items-center justify-center text-base-1 text-dimgray-200">
        <div className="flex-1 relative">
          If you’re using Mercury Wallet for the first time, create a new
          wallet. If you have an existing wallet, load the wallet from your
          device storage, or use your seed phrase or backup file to restore the
          wallet.
        </div>
      </div>
      <div className="w-[322px] flex flex-row flex-wrap items-start justify-center gap-[51px] text-sm">
        <button
          className="cursor-pointer [border:none] py-3 px-4 bg-white rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-12 flex flex-row items-center justify-center box-border gap-[10px]"
          onClick={onNewWalletButtonClick}
        >
          <img
            className="relative w-[21px] h-[18px] object-cover"
            alt=""
            src="/restoreimg-2@2x.png"
          />
          <div className="relative text-sm tracking-[-0.02em] leading-[19px] font-body text-black text-left">
            New wallet
          </div>
        </button>
        <div
          className="rounded-md bg-whitesmoke shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] w-[137px] h-12 flex flex-row items-center justify-center py-3 px-4 box-border gap-[10px] cursor-pointer"
          onClick={onLoadWalletButtonContainerClick}
        >
          <img
            className="relative w-[21px] h-[18px] object-cover"
            alt=""
            src="/restoreimg-1@2x.png"
          />
          <div className="relative tracking-[-0.02em] leading-[19px]">
            Load wallet
          </div>
        </div>
        <button
          className="cursor-pointer [border:none] py-3 px-4 bg-whitesmoke rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-12 flex flex-row items-center justify-center box-border gap-[10px]"
          onClick={onRecoverWalletButtonClick}
        >
          <img
            className="relative w-[21px] h-[18px] object-cover"
            alt=""
            src="/restoreimg-1@2x.png"
          />
          <div className="relative text-sm tracking-[-0.02em] leading-[19px] font-body text-black text-left">
            Recover wallet
          </div>
        </button>
      </div>
    </div>
  );
};

export default WelcomeContainer;
