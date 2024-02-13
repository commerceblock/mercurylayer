import { useEffect, useState } from 'react';
import transferReceive from '../logic/transferReceive';
import { useDispatch } from 'react-redux';
import { walletActions } from '../store/wallet';
import { QRCodeSVG } from 'qrcode.react';

const ReceiveStatecoinsInfoPanel = ({ wallet }) => {
  const dispatch = useDispatch();

  const [address, setAddress] = useState(null);
  const [truncated, setTruncated] = useState('');
  const [selectedCoinIndex, setSelectedCoinIndex] = useState(0); // Track the current index+
  const [loading, setLoading] = useState(false);
  const { coins } = wallet;
  const filteredCoins = coins.filter((coin) => coin.status === 'INITIALISED' && coin.amount === undefined);


  const getAddress = async () => {
    let op = await getNewTransferAddress();
    //setSelectedCoinIndex(filteredCoins.length);
  }

  const onGenerateAddress = async () => {
    setLoading(true);

    setTimeout(() => {
      getAddress().then(() => {
        setSelectedCoinIndex(filteredCoins.length);
        setLoading(false);
      });
    }, 500);
  }

  useEffect(() => {
    // Cleanup function to clear the timeout when component unmounts
  }, [filteredCoins, getAddress, setSelectedCoinIndex, setLoading]);

  useEffect(() => {
    if (filteredCoins.length === 0) {
      getAddress();
    } else {
      setAddress(filteredCoins[selectedCoinIndex].address);
      setTruncated(filteredCoins[selectedCoinIndex].address.substring(0, 30) + "...");
    }
  }, [filteredCoins, selectedCoinIndex, getAddress]); // Include selectedCoinIndex in dependency array

  const getNewTransferAddress = async () => {
    let newCoin = await transferReceive.newTransferAddress(wallet);
    await dispatch(walletActions.insertNewTransferCoin(newCoin));
    return newCoin;
  };

  const onPrevButton = () => {
    setSelectedCoinIndex(prevIndex => Math.max(0, prevIndex - 1)); // Move to previous index
  };

  const onNextButton = () => {
    setSelectedCoinIndex(prevIndex => Math.min(filteredCoins.length - 1, prevIndex + 1)); // Move to next index
  };

  const onCopyButton = () => {
    if (address) {
      navigator.clipboard.writeText(address)
        .then(() => {
          console.log('Address copied to clipboard');
          // You can add a notification or perform any other action upon successful copy
        })
        .catch((error) => {
          console.error('Failed to copy address: ', error);
          // You can handle the error here, e.g., display an error message
        });
    }
  };

  return (
    <div className="self-stretch rounded-sm bg-white shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[300px] overflow-hidden shrink-0 flex flex-col items-start justify-start p-2.5 box-border gap-[10px] text-left text-xs text-black font-body-small">
      {loading && (
        <div className="self-stretch h-50 overflow-hidden shrink-0 flex flex-row items-center justify-center">
          {/* Tailwind CSS loading spinner here */}
          <div className="flex flex-col items-center justify-center p-2.5">
            {/* Use a simple div to create a loading spinner */}
            <div className="border-t-4 border-blue-500 border-solid h-12 w-12 rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-gray-500">Generating Address...</p>
          </div>
        </div>

      )}
      {!loading && (
        <>
          <div className="self-stretch h-10 overflow-hidden shrink-0 flex flex-row items-start justify-between">
            <div className="self-stretch flex flex-row items-start justify-start">
              <div className="relative">Statecoin Address</div>
            </div>
            <div className="self-stretch w-[129px] overflow-hidden shrink-0 flex flex-row items-start justify-end py-2.5 px-0 box-border gap-[5px]">
              <button
                className="
                  cursor-pointer 
                  p-2.5 
                  bg-white 
                  self-stretch flex-1 rounded-sm 
                  shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] 
                  overflow-hidden flex flex-row items-center justify-center 
                  border-[0.1px] border-solid border-black
                "
                onClick={onPrevButton}
              >
                <img className="w-[18px] relative h-3.5" alt="" src="/left-arrow.svg" />
              </button>
              <button
                className="
                  cursor-pointer 
                  p-0.5 
                  bg-white 
                  self-stretch 
                  flex-1 rounded-sm 
                  shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] 
                  overflow-hidden flex flex-row items-center 
                  justify-center 
                  border-[0.1px] border-solid border-black"
                onClick={onNextButton}
              >
                <img className="w-[18px] relative h-3.5" alt="" src="/right-arrow.svg" />
              </button>
            </div>
          </div>
          <div className="self-stretch overflow-hidden flex flex-row items-start justify-start p-2.5 gap-[10px]">
            <div className="bg-silver-300 overflow-hidden flex flex-col items-start justify-start p-2.5">
              <QRCodeSVG value={address} />
            </div>
            <div className="self-stretch flex-1 overflow-hidden flex flex-col items-start justify-start p-2.5 gap-[10px]">
              <div className="self-stretch flex-1 bg-aliceblue overflow-hidden flex flex-row items-center justify-between p-2.5">
                <div className="flex-1 flex flex-row items-center justify-start gap-[8px]">
                  <button onClick={onCopyButton} className="cursor-pointer [border:none] p-0 bg-[transparent] flex flex-row items-center justify-start">
                    <img className="w-2 relative h-2" alt="" src="/icon3.svg" />
                  </button>
                  <div className="relative" title={address}>{truncated}</div>
                </div>
                <button className="shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] cursor-pointer [border:none] py-2 px-1 bg-royalblue-200 rounded-sm overflow-hidden flex flex-row items-center justify-end">
                  <div className="relative text-4xs font-body-small text-white text-left">
                    Receive Index: {selectedCoinIndex + 1}
                  </div>
                </button>
              </div>
              <div className="self-stretch flex-1 bg-white overflow-hidden flex flex-row items-center justify-between p-2.5">
                <button onClick={onGenerateAddress} className="cursor-pointer py-2 px-1 bg-white rounded-sm shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] overflow-hidden flex flex-row items-center justify-center border-[0.1px] border-solid border-black">
                  <div className="relative text-4xs font-body-medium text-black text-left">
                    Generate Address
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

};

export default ReceiveStatecoinsInfoPanel;
