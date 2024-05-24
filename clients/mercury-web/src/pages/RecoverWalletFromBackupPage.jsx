import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import walletManager from "../logic/walletManager";
import { useDispatch, useSelector } from "react-redux";
import { walletActions } from "../store/wallet";

const RecoverWalletFromBackupPage = () => {
  const [password, setPassword] = useState(""); // state that stores the password
  const [errorMessage, setErrorMessage] = useState(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const encrypted_wallets = useSelector(
    (state) => state.encryptedWallets.encrypted_wallets
  );

  const isWellFormatted = (obj) => {
    return obj.hasOwnProperty("name") && obj.hasOwnProperty("wallet_json");
  };

  const isValidJSON = (str) => {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  };

  /* TODO - Fix me, remove ipcRenderer
  useEffect(() => {
    setErrorMessage('')
    const handleImportWalletData = async (event, backupData) => {
      try {
        // Check if backupData is valid JSON
        if (isValidJSON(backupData)) {
          const parsedData = JSON.parse(backupData)

          // Check if parsedData is well-formatted
          if (isWellFormatted(parsedData)) {
            // check that another wallet doesn't already exist in memory...
            if (encrypted_wallets.length > 0) {
              const walletExists = encrypted_wallets.some((wallet) => {
                return wallet.name === parsedData.name
              })

              if (walletExists) {
                setErrorMessage(`Wallet ${parsedData.name} already exists`)
                return
              }
            }

            // TODO: Password here is not the live password value within the react state, it is using a previous value!!!
            console.log('password value is:', password)
            try {
              // attempt to decrypt the wallet_json
              let decrypted_wallet = await walletManager.decryptString(
                parsedData.wallet_json,
                password
              )

              let decrypted_backuptx = await walletManager.decryptString(
                parsedData.backup_tx,
                password
              )

              let wallet_json = JSON.parse(decrypted_wallet)
              let backup_tx = JSON.parse(decrypted_backuptx)

              await dispatch(walletActions.loadWallet(wallet_json))
              await dispatch(walletActions.setPassword(password))
              await dispatch(walletActions.selectWallet(wallet_json.name))
              await dispatch(walletActions.loadBackupTxs(backup_tx))
              navigate('/mainpage')
            } catch (e) {
              setErrorMessage('Incorrect Password')
            }
          } else {
            setErrorMessage('Backup data is not well-formatted')
          }
        } else {
          setErrorMessage('Backup data is not valid JSON')
        }
      } catch (e) {
        setErrorMessage(`An error occurred: ${e.message}`)
        return
      }
    }

    // listen for electron updates namely received-backup-data
    window.electron.ipcRenderer.on('received-backup-data', handleImportWalletData)
    return () => window.electron.ipcRenderer.removeAllListeners('received-backup-data')
  }, [password])*/

  const onHelpButtonContainerClick = useCallback(() => {
    navigate("/helpandsupportpage");
  }, [navigate]);

  const onCogIconClick = useCallback(() => {
    navigate("/settingspage");
  }, [navigate]);

  const onLogoutButtonIconClick = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const onStateOnContainerClick = useCallback(() => {
    navigate("/recoverwalletfromseedpage");
  }, [navigate]);

  const onSelectBackupFileButtonClick = useCallback(() => {
    console.log("password entered was:", password);

    window.api.selectBackupFile();
  }, [navigate]);

  const onGoBackButtonClick = () => {
    navigate("/");
  };

  const onPasswordChange = (event) => {
    console.log("changing password value...");
    setPassword(event.target.value);
  };

  return (
    <div className="w-full relative bg-whitesmoke h-[926px] overflow-hidden flex flex-col items-center justify-start gap-[22px] text-center text-base text-primary font-body-small">
      <NavBar
        onHelpButtonContainerClick={onHelpButtonContainerClick}
        onCogIconClick={onCogIconClick}
        onLogoutButtonIconClick={onLogoutButtonIconClick}
        showLogoutButton={false}
        showSettingsButton={false}
        showHelpButton={false}
      />
      <div className="self-stretch rounded-8xs overflow-hidden flex flex-row items-center justify-center py-7 px-0">
        <div
          className="flex-1 relative bg-white box-border h-[47px] overflow-hidden cursor-pointer border-b-[1px] border-solid border-tertiary"
          onClick={onStateOnContainerClick}
        >
          <div className="absolute w-full top-[calc(50%_-_11.5px)] left-[0px] tracking-[-0.02em] leading-[22px] inline-block h-11">
            Restore from Seed
          </div>
        </div>
        <div className="flex-1 relative bg-white box-border h-12 overflow-hidden border-b-[2px] border-solid border-royalblue-100">
          <div className="absolute w-full top-[calc(50%_-_12px)] left-[0px] tracking-[-0.02em] leading-[22px] font-semibold inline-block">
            Restore from Backup
          </div>
        </div>
      </div>
      <div className="self-stretch flex-1 flex flex-col items-center justify-start gap-[22px] text-left text-sm">
        <div className="w-[345px] flex flex-col items-start justify-end gap-[7px]">
          <div className="relative tracking-[-0.02em] leading-[19px]" />
          <input
            className="[outline:none] font-body-small text-base bg-white self-stretch rounded-md box-border h-12 flex flex-row items-start justify-start p-3 text-darkgray-300 border-[1px] border-solid border-primary"
            placeholder="Password"
            type="password"
            value={password}
            onChange={onPasswordChange}
          />
        </div>
        {errorMessage && (
          <div className="text-red font-bold text-xl mt-4">{errorMessage}</div>
        )}
        <div className="self-stretch flex-1 flex flex-row items-start justify-center gap-[20px]">
          <button
            className="cursor-pointer [border:none] py-3 px-4 bg-dimgray-100 w-[114px] rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center box-border"
            onClick={onGoBackButtonClick}
          >
            <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body-small text-white text-left">
              GO BACK
            </div>
          </button>
          <button
            className="cursor-pointer [border:none] py-3 px-4 bg-mediumslateblue-200 w-[114px] rounded-md shadow-[0px_4px_4px_rgba(0,_0,_0,_0.25)] h-[30px] overflow-hidden shrink-0 flex flex-row items-center justify-center box-border"
            onClick={onSelectBackupFileButtonClick}
          >
            <div className="relative text-base tracking-[-0.02em] leading-[22px] font-semibold font-body-small text-white text-left">
              LOAD FILE
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecoverWalletFromBackupPage;
