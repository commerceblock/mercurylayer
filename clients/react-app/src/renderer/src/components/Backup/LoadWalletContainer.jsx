import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from 'react-redux';

const LoadWalletContainer = ({ walletLoaded }) => {

  const wallets = useSelector(state => state.wallet.wallets);

  let walletList = wallets.map((wallet) => (
    <option key={wallet.name} value={wallet.name}>
      {wallet.name}
    </option>
  ));

  const [textInputValue, setTextInputValue] = useState("");
  const [textInput1Value, setTextInput1Value] = useState("");
  const navigate = useNavigate();

  const onGoBackButtonContainerClick = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const onGoBackButtonContainer1Click = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const onOpenButtonClick = useCallback(() => {
    navigate("/mainpage");
  }, [navigate]);

  return (
    <div className="absolute w-[calc(100%_-_83px)] top-[146px] right-[36px] left-[47px] flex flex-col items-center justify-center gap-[60px]">
      {!walletLoaded && (
        <section
          className="self-stretch flex flex-col items-center justify-center gap-[21px] text-left text-sm-6 text-black font-body"
          id="NoWallet"
        >
          <div className="flex flex-row items-center justify-center p-2.5">
            <div className="relative">
              No Wallet in memory. Please create a new one.
            </div>
          </div>
          <div
            className="rounded-md bg-mediumslateblue-200 shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] w-[114px] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center py-3 px-4 box-border cursor-pointer text-base text-white"
            onClick={onGoBackButtonContainerClick}
          >
            <div className="relative tracking-[-0.02em] leading-[22px] font-semibold">
              GO BACK
            </div>
          </div>
        </section>
      )}
      {walletLoaded && (
        <section
          className="self-stretch flex flex-col items-center justify-center gap-[22px] text-center text-sm text-primary font-body"
          id="FoundWallet"
        >
          <div className="w-[345px] flex flex-col items-center justify-center gap-[14px]">
            <div className="w-[345px] h-[73px] flex flex-col items-start justify-end gap-[7px]">
              <div className="self-stretch relative tracking-[-0.02em] leading-[19px]">
                Select a wallet to load and input its password
              </div>
              <select
                className="[outline:none] font-body text-base bg-white self-stretch flex-1 relative rounded-md p-3 text-primary border-[1px] border-solid border-primary"
                value={textInputValue}
                onChange={(event) => setTextInputValue(event.target.value)}
              >
                {walletList}
              </select>
            </div>
            <div className="w-[345px] flex flex-col items-start justify-end gap-[7px] text-left">
              <div className="relative tracking-[-0.02em] leading-[19px] hidden">
                Label
              </div>
              <input
                className="[outline:none] font-body text-base bg-white self-stretch rounded-md box-border h-12 flex flex-row items-start justify-start p-3 text-primary border-[1px] border-solid border-primary"
                placeholder="Password"
                type="text"
                value={textInput1Value}
                onChange={(event) => setTextInput1Value(event.target.value)}
              />
            </div>
          </div>
          <div className="w-[247px] flex flex-row items-center justify-center gap-[19px] text-left text-base text-white">
            <div
              className="rounded-md bg-dimgray-100 shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] w-[114px] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center py-3 px-4 box-border cursor-pointer"
              onClick={onGoBackButtonContainer1Click}
            >
              <div className="relative tracking-[-0.02em] leading-[22px] font-semibold">
                GO BACK
              </div>
            </div>
            <button
              className="cursor-pointer [border:none] py-3 px-4 bg-mediumslateblue-200 rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] w-[114px] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center box-border"
              onClick={onOpenButtonClick}
            >
              <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body text-white text-left">
                OPEN
              </div>
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default LoadWalletContainer;
