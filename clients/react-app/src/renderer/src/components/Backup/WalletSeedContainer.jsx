import { useEffect } from "react";
import wizard, { wizardActions } from "../store/wizard";
import wallet_manager from './../logic/walletManager';
import { useDispatch, useSelector } from "react-redux";
import DisplaySeed from "./DisplaySeed";

const WalletSeedContainer = () => {

  const wizardState = useSelector((state) => state.wizard);

  const dispatch = useDispatch();

  useEffect(() => {
    const fetchData = async () => {
      try {
        let mnemonic = await wallet_manager.createMnemonic();
        await dispatch(wizardActions.setMnemonic(mnemonic));
        console.log('created a key:', mnemonic);
      } catch (error) {
        // Handle any errors that might occur during the asynchronous operations
        console.error('Error:', error);
      }
    };

    fetchData();
  }, [dispatch]);

  return (
    <div className="absolute w-[calc(100%_-_60px)] top-[110px] right-[23px] left-[37px] flex flex-col items-center justify-center gap-[14px] text-left text-sm text-gray-400 font-body">
      <div className="w-[368px] flex flex-row items-start justify-start gap-[48px]">
        <div className="relative w-[110px] h-[43px]">
          <div className="absolute top-[26px] left-[calc(50%_-_55px)] font-extralight">
            Create Password
          </div>
          <div className="absolute top-[0px] left-[calc(50%_-_55px)] rounded-[50%] bg-gray-400 w-[22px] h-[22px]" />
          <div className="absolute top-[2px] left-[calc(50%_-_47px)] font-extralight text-white">
            1
          </div>
        </div>
        <div className="relative w-[75px] h-[43px] text-mediumslateblue-300">
          <div className="absolute top-[26px] left-[calc(50%_-_37.5px)] font-extralight">
            Wallet seed
          </div>
          <div className="absolute top-[calc(50%_-_21.5px)] left-[calc(50%_-_37.5px)] rounded-[50%] bg-mediumslateblue-300 w-[22px] h-[22px]" />
          <div className="absolute top-[calc(50%_-_19.5px)] left-[calc(50%_-_30.5px)] font-extralight text-white">
            2
          </div>
        </div>
        <div className="relative w-[87px] h-[43px] text-gray-200">
          <div className="absolute top-[26px] left-[calc(50%_-_43.5px)] font-extralight">
            Confirm seed
          </div>
          <div className="absolute top-[calc(50%_-_21.5px)] left-[calc(50%_-_43.5px)] rounded-[50%] bg-gray-400 w-[22px] h-[22px]" />
          <div className="absolute top-[calc(50%_-_19.5px)] left-[calc(50%_-_36.5px)] font-extralight text-white">
            3
          </div>
        </div>
      </div>
      <div className="w-[400px] flex flex-row items-center justify-center p-2.5 box-border">
        <section className="relative text-sm text-black text-left inline-block w-[391px] shrink-0 font-body">
          <p className="m-0">{`The list of 12 words below is the recovery seed key for the wallet you are creating. `}</p>
          <p className="m-0">
            <b>&nbsp;</b>
          </p>
          <p className="m-0">
            <b>
              Carefully write down and store your seed somewhere safe, as it
              provides access to your wallet.
            </b>
          </p>
          <p className="m-0">&nbsp;</p>
          <p className="m-0">
            For best practice, never store it online or on the same computer as
            the wallet. The seed key is the only way to recover your wallet if
            your computer is lost, stolen or stops working. There is no way to
            recover the seed if lost.
          </p>
          <p>
            {wizardState && wizardState.mnemonic && <DisplaySeed mnemonic={wizardState.mnemonic} />}
          </p>
        </section>
      </div>
    </div>
  );
};

export default WalletSeedContainer;
