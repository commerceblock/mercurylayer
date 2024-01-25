import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import DepositHeaderPanel from "../components/DepositHeaderPanel";
import TokenInfoCard from "../components/TokenInfoCard";
import { useDispatch, useSelector } from 'react-redux';
import { depositActions } from '../store/deposit';

const DepositPage = () => {
  const dispatch = useDispatch();
  const pending_tokens = useSelector(state => state.deposit.pending_tokens);

  const navigate = useNavigate();
  const [showNoTokenWindow, setShowNoTokenWindow] = useState(false);

  const onCloseNoTokenWindow = useCallback(() => {
    setShowNoTokenWindow(false);
  }, []);

  useEffect(() => {
    if (pending_tokens.length === 0 || !pending_tokens.some(token => !token.paid)) {
      const newToken = {
        btc_payment_address: "bc1qlahxpat3c75w40xljut960j7wjjj6v3yrxf363",
        token_id: "d6d439b1-26af-4998-9f88-7b1669c8c5c3",
        fee: "0.001",
        lightning_invoice: "lnbc1m1pjm9qf0pp57qj9rn5de39wvk6fee4jthmrn235448hf9ktg449dx80wr423saqdp6vsmxgdpn893rztfjxeskvtf58yunstfevcurstfhvgcnvd3evvuxxdtrxvcqzzsxqyz5vqsp5agkaun03wwqgdfh90v4yy5a4kmd7s765d03juxjp707slat69ecs9qyyssqqe92acfupthekjhudlc9ysqua9jlwd76ms689dv6ma9xtgg5aprzvn8w669qhcrshpn96zwah6wdkuafp0wxwdfxmq48hfecjvtwe3cq5345xy",
        processor_id: "f02451ce8dcc4ae65b49ce6b25df639aa34ad4f7496cb456a5698ef70eaa8c3a",
        confirmed: false,
        spent: false
      };
      // Dispatch the action to add the new token to the state
      dispatch(depositActions.addPendingToken(newToken));
    }
  }, [dispatch, pending_tokens]);

  const onHelpButtonContainerClick = useCallback(() => {
    navigate("/helpandsupportpage");
  }, [navigate]);

  const onCogIconClick = useCallback(() => {
    navigate("/settingspage");
  }, [navigate]);

  const onLogoutButtonIconClick = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const onBackButtonContainerClick = useCallback(() => {
    navigate("/wallet-main-1");
  }, [navigate]);

  const onContinueButtonClick = useCallback(() => {
    if (pending_tokens.some(token => !token.confirmed)) {
      setShowNoTokenWindow(true);
    } else {
      navigate("/depositpage1");
    }
  }, [navigate, pending_tokens]);

  return (
    <div className="w-full relative bg-whitesmoke h-[926px] flex flex-col items-center justify-start gap-[33px] text-left text-sm text-white font-body-small">
      <NavBar
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        showLogoutButton
        showSettingsButton
        showHelpButton
      />
      <div className="self-stretch h-[121px] flex flex-col items-center justify-start py-0 px-2.5 box-border">
        <DepositHeaderPanel
          propBackgroundColor="unset"
          propDisplay="inline-block"
          onBackButtonContainerClick={onBackButtonContainerClick}
        />
      </div>
      <div className="self-stretch flex-1 flex flex-row items-center justify-between p-2.5">
        <div className="self-stretch flex-1 relative">
          <div className="absolute h-full w-[27.55%] top-[0%] right-[0%] bottom-[0%] left-[72.45%] flex flex-row items-center justify-center gap-[7px]">
            <div className="w-[22px] h-[22px] flex flex-row items-center justify-center relative gap-[10px]">
              <div className="self-stretch flex-1 relative rounded-[50%] bg-gray-500 z-[0]" />
              <div className="w-[9px] absolute my-0 mx-[!important] top-[calc(50%_-_9px)] left-[calc(50%_-_4px)] font-extralight inline-block z-[1]">
                3
              </div>
            </div>
            <div className="relative font-extralight text-gray-500">
              BTC Details
            </div>
          </div>
          <div className="absolute h-full w-[32.01%] top-[0%] right-[30.71%] bottom-[0%] left-[37.28%] flex flex-row items-center justify-center gap-[7px]">
            <div className="w-[22px] h-[22px] flex flex-row items-center justify-center relative gap-[10px]">
              <div className="self-stretch flex-1 relative rounded-[50%] bg-gray-500 z-[0]" />
              <div className="w-[9px] absolute my-0 mx-[!important] top-[calc(50%_-_9px)] left-[calc(50%_-_4px)] font-extralight inline-block z-[1]">
                2
              </div>
            </div>
            <div className="relative font-extralight text-gray-500">
              Choose Amount
            </div>
          </div>
          <div className="absolute h-full w-[34.12%] top-[0%] right-[65.88%] bottom-[0%] left-[0%] flex flex-row items-center justify-center gap-[5px]">
            <div className="w-[22px] h-[22px] flex flex-row items-center justify-center relative gap-[10px]">
              <div className="self-stretch flex-1 relative rounded-[50%] bg-mediumslateblue-300 z-[0]" />
              <div className="w-1.5 absolute my-0 mx-[!important] top-[calc(50%_-_9px)] left-[calc(50%_-_3px)] font-extralight inline-block z-[1]">
                1
              </div>
            </div>
            <div className="relative font-extralight text-gray-500">
              Pay Fee
            </div>
          </div>
        </div>
      </div>
      {
        pending_tokens.map((token, index) => (
          <div key={index} className="self-stretch h-[448px] overflow-y-auto shrink-0 flex flex-col items-center justify-start p-2.5 box-border">
            <TokenInfoCard
              key={index}
              status={token.status}
              fee={token.fee}
              invoice={token.invoice}
              token_id={token.token_id}
              processor_id={token.processor_id}
              bitcoin_address={token.btc_payment_address}
            />
          </div>
        ))
      }
      <div className="self-stretch flex-1 overflow-hidden flex flex-col items-end justify-center p-2.5">
        <button
          className={`cursor-pointer [border:none] p-0 w-[90px] rounded-sm shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-end justify-end ${pending_tokens.some(token => !token.confirmed) ? 'bg-mediumslateblue-50' : 'bg-mediumslateblue-200'
            }`}
          onClick={onContinueButtonClick}
        >
          <div className="self-stretch flex-1 relative text-3xs tracking-[-0.02em] leading-[22px] font-semibold font-body-small text-white text-center flex items-center justify-center">
            CONTINUE
          </div>
        </button>

      </div>

      {showNoTokenWindow && (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded-md text-black">
            <p>No token has been paid. Please pay at least one token before continuing.</p>
            <button className='cursor-pointer shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] tracking-[-0.02em] leading-[22px] text-white bg-mediumslateblue-200' onClick={onCloseNoTokenWindow}>OK</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default DepositPage;