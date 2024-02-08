import { useState, useEffect } from 'react';
import { walletActions } from '../store/wallet'
import withdraw from '../logic/withdraw';
import { useDispatch, useSelector } from 'react-redux';

const TransactionDetailsPanel = ({ wallet, selectedCoin }) => {

    const dispatch = useDispatch();
    const backupTxs = useSelector(state => state.wallet.backupTxs);
    const [isProcessingCoinRequest, setIsProcessingCoinRequest] = useState(null);
    const [toAddress, setToAddress] = useState('');

    const onWithdrawClick = async () => {

        if (selectedCoin == null) {
            alert('Select a coin to withdraw.');
            return;
        }
        if (selectedCoin.status != "CONFIRMED") {
            alert("Coin is not confirmed yet.");
            return;
        }
        if (toAddress === '') {
            alert('enter a bitcoin address to send the funds to.');
            return;
        }

        console.log('try to withdraw the component now...');

        setIsProcessingCoinRequest(true);

        let res = await withdraw.execute(wallet, backupTxs, selectedCoin, toAddress);

        dispatch(walletActions.withdraw(res));

        setToAddress("");

        setIsProcessingCoinRequest(false);
    }
    return (
        <div className="flex-1 rounded-sm bg-white shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[281px] overflow-hidden flex flex-col items-center justify-start p-2.5 box-border gap-[10px] min-w-[388px] text-left text-base text-black font-body-small">
            <div className="self-stretch overflow-hidden flex flex-row items-center justify-start p-2.5">
                <div className="relative">Transaction Details</div>
            </div>
            {isProcessingCoinRequest ? (
                // Show loading spinner when processing the coin request
                <div className="self-stretch overflow-hidden flex flex-row items-center justify-center py-5 px-2.5 text-center text-sm text-primary">
                    <div className="flex items-center justify-center space-x-2">
                        <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 4.418 3.582 8 8 8v-4zm2-9.228V2c-3.526 0-6.543 2.337-7.536 5.572a8.019 8.019 0 013.118-.509L8 7.063zm7.516.509A7.963 7.963 0 0120 12h4c0-6.627-5.373-12-12-12v4zM20 12c0 3.526-2.337 6.543-5.572 7.536a8.019 8.019 0 01-.509-3.118l3.316-1.312A7.963 7.963 0 0020 12h-4zm-5.516 3.228l-3.316-1.312a7.96 7.96 0 01-2.612 1.303L11.484 15zm-3.968-2.576a7.962 7.962 0 012.612-1.303L12.516 9.5 7.516 8.228zm1.403-2.648l3.316-1.312a7.96 7.96 0 012.612 1.303l-3.316 1.312z"></path>
                        </svg>
                        <span>Sending BTC</span>
                    </div>
                </div>
            ) : (
                selectedCoin ? (
                    <>
                        <div className="self-stretch overflow-hidden flex flex-row items-center justify-center py-5 px-2.5 text-center text-sm text-primary">
                            <div className="w-[345px] flex flex-col items-center justify-center gap-[7px]">
                                <div className="relative tracking-[-0.02em] leading-[19px]">
                                    Your Bitcoin Address
                                </div>
                                <div className="self-stretch rounded-md bg-white box-border h-12 flex flex-row items-start justify-start p-3 text-left text-xs border-[1px] border-solid border-primary">
                                    <input className="flex-1 relative tracking-[-0.02em] leading-[22px] focus:outline-none" placeholder="Destination Address for Withdrawal" type="text" value={toAddress} onChange={(e) => setToAddress(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <div className="self-stretch overflow-hidden flex flex-row items-center justify-center p-2.5">
                            <button className="cursor-pointer rounded-sm bg-royalblue-200 
                                                shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] overflow-hidden 
                                                flex flex-row items-center justify-center p-2.5"
                                onClick={onWithdrawClick}>
                                <div className="relative text-white">Withdraw BTC</div>
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="self-stretch overflow-hidden flex flex-row items-center justify-center py-5 px-2.5 text-center text-sm text-primary">
                        <div className="relative">Please select a coin to withdraw first.</div>
                    </div>
                )
            )}
        </div>
    );
};

export default TransactionDetailsPanel;
