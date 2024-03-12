import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import walletManager from "../logic/walletManager";
import { useSelector } from "react-redux";

import settingsImg from "../../resources/settings_icon.png?asset&asarUnpack";

const SettingsHeaderPanel = ({ wallet }) => {
  const password = useSelector((state) => state.wallet.password);
  const backupTxs = useSelector((state) => state.wallet.backupTxs);
  const navigate = useNavigate();

  const onFrameContainer1Click = useCallback(() => {
    navigate("/mainpage");
  }, [navigate]);

  const downloadWalletBackup = () => {
    console.log("Wallet->", wallet);
    let this_backup_txs = backupTxs.filter(
      (tx) => tx.walletName === wallet.name
    );
    let encrypted_backup_txs = walletManager.encryptString(
      JSON.stringify(this_backup_txs),
      password
    );
    let encrypted_wallet = walletManager.encryptString(
      JSON.stringify(wallet),
      password
    );
    let data = {
      name: wallet.name,
      wallet_json: encrypted_wallet,
      backup_tx: encrypted_backup_txs,
    };
    data = JSON.stringify(data);

    var a = document.createElement("a");
    var file = new Blob([data], { type: "application/json" });
    a.href = URL.createObjectURL(file);
    a.download = "wallet_backup.json";
    a.click();
  };

  const downloadActivity = () => {
    let activity_data = wallet.activities;
    activity_data = JSON.stringify(activity_data);

    var a = document.createElement("a");
    var file = new Blob([activity_data], { type: "application/json" });

    a.href = URL.createObjectURL(file);
    a.download = "activity.json";
    a.click();
  };

  return (
    <div className="self-stretch rounded-sm shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[117px] flex flex-col items-center justify-center text-left text-3xl text-black font-body-heavy">
      <div className="self-stretch rounded-t-sm rounded-b-none bg-white h-[39px] flex flex-row items-center justify-between p-2.5 box-border">
        <div className="w-[201px] flex flex-row items-center justify-start gap-[6px]">
          <img
            className="w-[37px] relative h-[37px] object-cover"
            alt=""
            src={settingsImg}
          />
          <div className="relative">Settings</div>
        </div>
        <div
          className="flex flex-row items-center justify-start cursor-pointer text-center text-xs text-gray-600"
          onClick={onFrameContainer1Click}
        >
          <div className="w-[55px] rounded-3xs box-border h-7 flex flex-row items-center justify-center p-2.5 border-[1px] border-solid border-silver-100">
            <div className="flex-1 relative">BACK</div>
          </div>
        </div>
      </div>
      <div className="self-stretch bg-white h-[39px] flex flex-row items-center justify-end py-[19px] px-[18px] box-border">
        {/*
          <button className="cursor-pointer [border:none] p-0 bg-mediumslateblue-200 w-[162px] rounded-sm shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[27px] overflow-hidden shrink-0 flex flex-row items-center justify-center">
          <div className="self-stretch flex-1 relative text-xs tracking-[-0.02em] leading-[22px] font-semibold font-body-heavy text-white text-center flex items-center justify-center">
            MANAGE TRANSACTIONS
          </div>
        </button> */}
        <button
          onClick={() => downloadWalletBackup()}
          className="cursor-pointer [border:none] p-0 bg-mediumslateblue-200 w-[165px] rounded-sm shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[27px] overflow-hidden shrink-0 flex flex-row items-center justify-center"
        >
          <div className="self-stretch flex-1 relative text-xs tracking-[-0.02em] leading-[22px] font-semibold font-body-heavy text-white text-center flex items-center justify-center">
            EXPORT WALLET BACKUP
          </div>
        </button>
      </div>
      <div className="self-stretch rounded-t-none rounded-b-sm bg-white h-[39px] flex flex-row items-center justify-end py-[19px] px-[18px] box-border">
        <button
          onClick={() => downloadActivity()}
          className="cursor-pointer [border:none] p-0 bg-mediumslateblue-200 w-[148px] rounded-sm shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-[23px] overflow-hidden shrink-0 flex flex-row items-center justify-center"
        >
          <div
            className="self-stretch flex-1 relative 
          text-xs tracking-[-0.02em] leading-[22px] font-semibold 
          font-body-heavy text-white text-center flex 
          items-center justify-center"
          >
            EXPORT ACTIVITY LOG
          </div>
        </button>
      </div>
    </div>
  );
};

export default SettingsHeaderPanel;
