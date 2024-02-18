const SettingsInfoPanel = () => {
  return (
    <div className="self-stretch shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] h-[650.9px] flex flex-col items-center justify-center text-center text-xs text-black font-body-heavy">
      <div className="self-stretch flex-1 bg-white overflow-hidden flex flex-col items-center justify-start py-2.5 px-[50px] gap-[10px]">
        <div className="self-stretch h-10 flex flex-row items-center justify-center">
          <div className="relative tracking-[-0.02em] leading-[22px] font-semibold">
            Connectivity Settings
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              placeholder="BlockExplorer URL"
              type="text"
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              placeholder="Electrum Protocol"
              type="text"
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              placeholder="Electrum Host"
              type="text"
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              placeholder="Electrum Port"
              type="text"
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              placeholder="Electrum Type"
              type="text"
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              placeholder="Tor Proxy Host"
              type="text"
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              placeholder="Tor Proxy Port"
              type="text"
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              placeholder="Tor Proxy Control Host"
              type="text"
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              placeholder="Tor Proxy Control Port"
              type="text"
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              placeholder="Statechain Entity API"
              type="text"
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body-heavy text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-400 border-[1px] border-solid border-primary"
              placeholder="Tor Statechain Entity API"
              type="text"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsInfoPanel
