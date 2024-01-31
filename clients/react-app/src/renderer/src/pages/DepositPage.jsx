import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import DepositHeaderPanel from "../components/DepositHeaderPanel";
import TokenInfoCard from "../components/TokenInfoCard";
import { useDispatch, useSelector } from 'react-redux';
import { depositActions } from '../store/deposit';
import deposit from "../logic/deposit";

const DepositPage = () => {
  const dispatch = useDispatch();
  const pending_deposits = useSelector(state => state.deposit.pending_deposits);
  const lastId = useSelector(state => state.deposit.lastId) + 1;

  const navigate = useNavigate();
  const [showNoTokenWindow, setShowNoTokenWindow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


  const onCloseNoTokenWindow = useCallback(() => {
    setShowNoTokenWindow(false);
  }, []);

  useEffect(() => {

    const generateToken = async () => {
      try {


        // If there are no deposits or no pending_deposits with confirmed = false
        if (pending_deposits.length === 0) {
          setLoading(true);

          let token = await deposit.newRealToken();

          // Extract relevant data from the real token response
          const { btc_payment_address, fee, lightning_invoice, processor_id, token_id } = token;
          console.log('fee is equal to:', fee);
          // Create a new deposit object with the extracted data and additional variables
          let newDeposit = {
            id: lastId,
            token: {
              btc_payment_address,
              fee,
              lightning_invoice,
              processor_id,
              token_id,
              confirmed: false,
              spent: false
            },
            statecoin_amount: 0.001, // modified in deposit 2
            btc_address: 'bc10000000000000000000000000000000000000000', // modified in deposit 3
            description: 'Add a description' // modified in deposit 3
          };

          // Dispatch the new deposit
          dispatch(depositActions.addDeposit(newDeposit));

        }
      } catch (error) {
        const errorMessage = error.toString();
        // Check if the error message contains information about a 500 status code
        if (errorMessage.includes("500")) {
          setError("Error occured with the server, please reload or try again later.");
        } else {
          setError("An error occurred. Please contact support.");
        }
      }


      setLoading(false);
    };


    generateToken();
  }, [dispatch, pending_deposits]);

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
    if (pending_deposits.some(deposit => deposit.token.confirmed)) {
      navigate("/depositpage1");
    } else {
      setShowNoTokenWindow(true);
    }
  }, [navigate, pending_deposits]);


  const onPayButtonClick = async (dep) => {
    console.log('trying to confirm the payment.. dep is equal to:', dep);

    console.log('passing token ->', dep.token.token_id);
    // Confirm the token payment
    await deposit.confirmDebugToken(dep.token.token_id);

    // Dispatch the action to update the confirmed status
    dispatch(depositActions.updateConfirmedStatus({ depositId: dep.id, confirmedStatus: true }));
  };


  const onDeleteButtonClick = useCallback((depositId) => {
    // remove the entire deposit from redux
    dispatch(depositActions.deletePendingToken({ depositId }));
  }, [dispatch]);

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

      {error && (
        <div className="self-stretch h-[480px] overflow-y-auto shrink-0 flex flex-col items-center justify-start p-2.5 box-border">
          {/* Use a simple div to create a loading spinner */}
          <div className="border-t-4 border-red border-solid h-12 w-12 rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-red">{error}</p>
        </div>
      )}

      {
        // modify this so that if we are in an error state then display the error, otherwise continue as normal with loading and tokeninfocard
        loading ?
          (
            <div className="self-stretch h-[480px] overflow-y-auto shrink-0 flex flex-col items-center justify-start p-2.5 box-border">
              {/* Use a simple div to create a loading spinner */}
              <div className="border-t-4 border-blue-500 border-solid h-12 w-12 rounded-full animate-spin"></div>
              <p className="mt-4 text-sm text-gray-500">Loading...</p>
            </div>
          ) :
          (pending_deposits.map((deposit, index) => (
            <div key={index} className="self-stretch h-[480px] overflow-y-auto shrink-0 flex flex-col items-center justify-start p-2.5 box-border">
              <TokenInfoCard
                key={index}
                confirmed={deposit.token.confirmed}
                fee={deposit.token.fee}
                invoice={deposit.token.invoice}
                token_id={deposit.token.token_id}
                processor_id={deposit.token.processor_id}
                bitcoin_address={deposit.token.btc_payment_address}
              />
              <button
                className={`cursor-pointer [border:none] p-0 w-[90px] rounded-sm shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-end justify-end bg-mediumslateblue-200
                }`}
                onClick={() => onPayButtonClick(deposit)}
              >
                <div className="self-stretch flex-1 relative text-3xs tracking-[-0.02em] leading-[22px] font-semibold font-body-small text-white text-center flex items-center justify-center">
                  PAY TOKEN
                </div>
              </button>

              <button
                className={`cursor-pointer [border:none] p-0 w-[90px] rounded-sm shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-end justify-end bg-mediumslateblue-200
                }`}
                onClick={() => onDeleteButtonClick(deposit.id)}
              >
                <div className="self-stretch flex-1 relative text-3xs tracking-[-0.02em] leading-[22px] font-semibold font-body-small text-white text-center flex items-center justify-center">
                  DELETE TOKEN
                </div>
              </button>
            </div>
          )))
      }

      <div className="self-stretch flex-1 overflow-hidden flex flex-col items-end justify-center p-2.5">
        <button
          className={`cursor-pointer [border:none] p-0 w-[90px] rounded-sm shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-end justify-end ${pending_deposits.some(deposit => deposit.token.confirmed) ? 'bg-mediumslateblue-200' : 'bg-mediumslateblue-50'
            }`}
          onClick={onContinueButtonClick}
          disabled={error}
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