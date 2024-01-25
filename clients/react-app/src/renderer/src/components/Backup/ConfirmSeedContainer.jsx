import { useEffect } from "react";
import wizard, { wizardActions } from "../store/wizard";
import wallet_manager from './../logic/walletManager';
import { useDispatch, useSelector } from "react-redux";
import DisplaySeed from "./DisplaySeed";

const ConfirmSeedContainer = () => {

    const wizardState = useSelector((state) => state.wizard);

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
                <div className="relative w-[75px] h-[43px] text-gray-200">
                    <div className="absolute top-[26px] left-[calc(50%_-_37.5px)] font-extralight">
                        Wallet seed
                    </div>
                    <div className="absolute top-[calc(50%_-_21.5px)] left-[calc(50%_-_37.5px)] rounded-[50%] bg-gray-400 w-[22px] h-[22px]" />
                    <div className="absolute top-[calc(50%_-_19.5px)] left-[calc(50%_-_30.5px)] font-extralight text-white">
                        2
                    </div>
                </div>
                <div className="relative w-[87px] h-[43px] text-mediumslateblue-300">
                    <div className="absolute top-[26px] left-[calc(50%_-_43.5px)] font-extralight">
                        Confirm seed
                    </div>
                    <div className="absolute top-[calc(50%_-_21.5px)] left-[calc(50%_-_43.5px)] rounded-[50%] bg-mediumslateblue-300 w-[22px] h-[22px]" />
                    <div className="absolute top-[calc(50%_-_19.5px)] left-[calc(50%_-_36.5px)] font-extralight text-white">
                        3
                    </div>
                </div>
            </div>
            <div className="w-[400px] flex flex-row items-center justify-center p-2.5 box-border">
                <section className="relative text-sm text-black text-left inline-block w-[391px] shrink-0 font-body">
                    <p className="m-0">{` `}</p>
                    <p className="m-0">
                        <b>&nbsp;</b>
                    </p>
                    <p className="m-0">
                        <b>
                            Click below or type in the missing words to confirm your seed key.
                        </b>
                    </p>
                    <p className="m-0">&nbsp;</p>
                    <p className="m-0">
                    </p>
                    <p>
                        {wizardState && wizardState.mnemonic && <DisplaySeed mnemonic={wizardState.mnemonic} />}
                    </p>
                </section>
            </div>
        </div>
    );
};

export default ConfirmSeedContainer;
