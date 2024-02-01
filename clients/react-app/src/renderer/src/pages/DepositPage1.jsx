import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import DepositHeaderPanel from "../components/DepositHeaderPanel";
import ChooseAmountCard from "../components/ChooseAmountCard";
import { useDispatch, useSelector } from 'react-redux';
//import deposit, { depositActions } from "../store/deposit";
import wallet, { walletActions } from '../store/wallet';
import deposit from './../logic/deposit';

const DepositPage1 = () => {

  const walletName = useSelector(state => state.wallet.selectedWallet);
  const wallets = useSelector(state => state.wallet.wallets);
  let wallet = wallets.find(w => w.name === walletName);
  const pending_deposits = useSelector((state) => state.deposit.pending_deposits);

  const [selectedStatecoin, setSelectedStatecoin] = useState(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

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

  const onBackButtonContainerClick = useCallback(() => {
    navigate("/depositpage0");
  }, [navigate]);

  const onContinueButtonClick = () => {
    console.log('this token value is: ', selectedStatecoin);
    setConfirmationOpen(true);
  };

  const handleStatecoinSelection = (statecoin) => {
    setSelectedStatecoin(statecoin);
  };

  const handleConfirmation = async () => {
    // Perform the action on confirmation
    console.log('Confirmed has been clicked...');

    if (selectedStatecoin == null) {
      console.log('selectedStatecoin is null');
      return;
    }


    if (selectedStatecoin.amount == null) {
      console.log('selectedStatecoin amount is null');
      return;
    }


    if (selectedStatecoin.token_id == null) {
      console.log('selectedStatecoin token_id is null');
      return;
    }


    if (wallet == null) {
      console.log('the wallet is null')
      return;
    }

    try {
      console.log('create a new address with wallet', wallet);
      console.log('amount: ', selectedStatecoin.amount);
      console.log('token_id', selectedStatecoin.token_id)

      // convert 0.001 to sats ->
      // Convert the amount to satoshis
      const amountInSatoshis = Math.round(selectedStatecoin.amount * 100000000);


      // For every pending_deposit and their selectedStatecoin, get their tokenId as well
      let depositAddress = await deposit.newAddress(wallet, amountInSatoshis, selectedStatecoin.token_id);

      console.log('created a depositAddress:', depositAddress);

      await dispatch(walletActions.newDepositAddress(depositAddress));

      // If the above is successfull then only go to the next page
      navigate("/depositpage2");
    } catch (e) {
      console.log('Error occured in Deposit page 2:', e);
    }



  };

  const handleCancelConfirmation = useCallback(() => {
    setConfirmationOpen(false);
  }, []);

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
              <div className="self-stretch flex-1 relative rounded-[50%] bg-mediumslateblue-300 z-[0]" />
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
              <div className="self-stretch flex-1 relative rounded-[50%] bg-gray-500 z-[0]" />
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
        pending_deposits.map((deposit, index) => (
          <div key={index} className="self-stretch h-[448px] overflow-y-auto shrink-0 flex flex-col items-center justify-start p-2.5 box-border">
            <ChooseAmountCard
              key={index}
              token={deposit.token}
              id={deposit.id}
              onStatecoinSelect={handleStatecoinSelection}
            />
          </div>
        ))
      }

      <div className="self-stretch flex-1 overflow-hidden flex flex-col items-end justify-center p-2.5">
        <button
          className={`cursor-pointer [border:none] p-0 ${selectedStatecoin === null ? 'bg-mediumslateblue-50' : 'bg-mediumslateblue-200'} w-[90px] rounded-sm shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-end justify-end ${selectedStatecoin === null ? 'cursor-not-allowed' : ''}`}
          onClick={onContinueButtonClick}
          disabled={selectedStatecoin === null}
        >
          <div className="self-stretch flex-1 relative text-3xs tracking-[-0.02em] leading-[22px] font-semibold font-body-small text-white text-center flex items-center justify-center">
            CONTINUE
          </div>
        </button>
      </div>

      {/* Confirmation Modal */}
      {confirmationOpen && (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded-md text-black">
            <p>Are you sure to create this statecoin?</p>
            <p>This will use up your token. Check the statecoin amount {selectedStatecoin.amount} carefully.</p>
            <button className='cursor-pointer shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] tracking-[-0.02em] leading-[22px] mb-2 text-white bg-mediumslateblue-200' onClick={handleConfirmation}>Confirm</button>
            {" "}
            <button className='cursor-pointer shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] tracking-[-0.02em] leading-[22px] text-white bg-red' onClick={handleCancelConfirmation}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepositPage1;
