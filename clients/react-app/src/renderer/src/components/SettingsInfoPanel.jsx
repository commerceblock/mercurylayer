const SettingsInfoPanel = ({ wallet }) => {
  return (
    <div className="self-stretch flex-1 shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] flex flex-col items-start justify-start text-center text-xs text-black font-body-small">
      <div className="self-stretch bg-white h-[412px] overflow-hidden shrink-0 flex flex-col items-start justify-start p-2.5 box-border gap-[10px]">
        <div className="relative tracking-[-0.02em] leading-[22px] font-semibold">
          Connectivity Settings
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body-small text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-300 border-[1px] border-solid border-primary"
              placeholder="BlockExplorer URL"
              type="text"
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] overflow-hidden shrink-0 flex flex-row items-center justify-center">
          <div className="self-stretch flex-1 flex flex-col items-start justify-start">
            <div className="self-stretch flex-1 flex flex-col items-start justify-end">
              <input
                className="[outline:none] font-body-small text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-300 border-[1px] border-solid border-primary"
                placeholder="Server Port"
                type="text"
              />
            </div>
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body-small text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-300 border-[1px] border-solid border-primary"
              placeholder={`Server Protocol
`}
              type="text"
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body-small text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-300 border-[1px] border-solid border-primary"
              placeholder="Server Type"
              type="text"
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body-small text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-300 border-[1px] border-solid border-primary"
              placeholder="Tor Proxy Host"
              type="text"
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body-small text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-300 border-[1px] border-solid border-primary"
              placeholder="Tor Proxy Port"
              type="text"
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body-small text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-300 border-[1px] border-solid border-primary"
              placeholder="State entity endpoint"
              type="text"
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body-small text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-300 border-[1px] border-solid border-primary"
              placeholder="Swap conductor endpoint"
              type="text"
            />
          </div>
        </div>
        <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body-small text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-darkgray-300 border-[1px] border-solid border-primary"
              placeholder="Electrum Server Host"
              type="text"
            />
          </div>
        </div>
      </div>
      <div className="self-stretch flex-1 bg-white overflow-hidden flex flex-col items-start justify-start p-2.5 gap-[10px] text-left">
        <b className="relative tracking-[-0.02em] leading-[22px]">Date/Time Format</b>
        <div className="self-stretch h-[45px] flex flex-col items-start justify-start text-center text-sm text-primary">
          <div className="self-stretch flex-1 flex flex-col items-center justify-center gap-[7px]">
            <div className="w-[388px] flex-1 relative tracking-[-0.02em] leading-[19px] hidden" />
            <input
              className="[outline:none] font-body-small text-base bg-white self-stretch flex-1 relative rounded-md p-3 text-primary border-[1px] border-solid border-primary"
              placeholder="mm/dd/yyyy HH:mm:ss"
              type="text"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsInfoPanel
