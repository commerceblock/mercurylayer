const TransactionDetailsPanel = ({ wallet }) => {
    return (
        <div className="flex-1 rounded-sm bg-white shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[281px] overflow-hidden flex flex-col items-center justify-start p-2.5 box-border gap-[10px] min-w-[388px] text-left text-base text-black font-body-small">
            <div className="self-stretch overflow-hidden flex flex-row items-center justify-start p-2.5">
                <div className="relative">Transaction Details</div>
            </div>
            <div className="self-stretch overflow-hidden flex flex-row items-center justify-center py-5 px-2.5 text-center text-sm text-primary">
                <div className="w-[345px] flex flex-col items-center justify-center gap-[7px]">
                    <div className="relative tracking-[-0.02em] leading-[19px]">
                        Your Bitcoin Address
                    </div>
                    <div className="self-stretch rounded-md bg-white box-border h-12 flex flex-row items-start justify-start p-3 text-left text-xs border-[1px] border-solid border-primary">
                        <input className="flex-1 relative tracking-[-0.02em] leading-[22px] focus:outline-none" placeholder="Destination Address for Withdrawal" type="text" />
                    </div>
                </div>
            </div>
            <div className="self-stretch overflow-hidden flex flex-row items-center justify-center p-2.5">
                <button className="cursor-pointer rounded-sm bg-royalblue-200 shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] overflow-hidden flex flex-row items-center justify-center p-2.5">
                    <div className="relative text-white">Withdraw BTC</div>
                </button>
            </div>
        </div>
    );
};

export default TransactionDetailsPanel;
