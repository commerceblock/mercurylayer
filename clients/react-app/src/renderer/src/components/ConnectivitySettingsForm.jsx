import { useState } from "react";

const ConnectivitySettingsForm = () => {
  const [textInputValue, setTextInputValue] = useState("");
  const [textInput1Value, setTextInput1Value] = useState("");
  const [textInput2Value, setTextInput2Value] = useState("");
  const [textInput3Value, setTextInput3Value] = useState("");
  const [textInput4Value, setTextInput4Value] = useState("");
  const [textInput5Value, setTextInput5Value] = useState("");
  const [textInput6Value, setTextInput6Value] = useState("");
  const [textInput7Value, setTextInput7Value] = useState("");
  const [textInput8Value, setTextInput8Value] = useState("");
  return (
    <div className="self-stretch flex-1 bg-white overflow-hidden flex flex-col items-start justify-start p-2.5 gap-[10px] text-center text-xs text-black font-body">
      <div className="relative tracking-[-0.02em] leading-[22px] font-semibold">
        Connectivity Settings
      </div>
      <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
        <div className="self-stretch flex-1 flex flex-col items-start justify-end">
          <input
            className="[outline:none] font-body text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-secondary border-[1px] border-solid border-primary"
            placeholder="Electrum Server Host"
            type="text"
            value={textInputValue}
            onChange={(event) => setTextInputValue(event.target.value)}
          />
        </div>
      </div>
      <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
        <div className="self-stretch flex-1 flex flex-col items-start justify-end">
          <input
            className="[outline:none] font-body text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-secondary border-[1px] border-solid border-primary"
            placeholder="BlockExplorer URL"
            type="text"
            value={textInput1Value}
            onChange={(event) => setTextInput1Value(event.target.value)}
          />
        </div>
      </div>
      <div className="self-stretch overflow-hidden flex flex-row items-center justify-center gap-[10px]">
        <div className="flex-1 h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-secondary border-[1px] border-solid border-primary"
              placeholder="Server Port"
              type="text"
              value={textInput2Value}
              onChange={(event) => setTextInput2Value(event.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 h-[31px] flex flex-col items-start justify-start">
          <div className="self-stretch flex-1 flex flex-col items-start justify-end">
            <input
              className="[outline:none] font-body text-5xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-secondary border-[1px] border-solid border-primary"
              placeholder="Server Protocol"
              type="text"
              value={textInput3Value}
              onChange={(event) => setTextInput3Value(event.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
        <div className="self-stretch flex-1 flex flex-col items-start justify-end">
          <input
            className="[outline:none] font-body text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-secondary border-[1px] border-solid border-primary"
            placeholder="Server Type"
            type="text"
            value={textInput4Value}
            onChange={(event) => setTextInput4Value(event.target.value)}
          />
        </div>
      </div>
      <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
        <div className="self-stretch flex-1 flex flex-col items-start justify-end">
          <input
            className="[outline:none] font-body text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-secondary border-[1px] border-solid border-primary"
            placeholder="Tor Proxy Host"
            type="text"
            value={textInput5Value}
            onChange={(event) => setTextInput5Value(event.target.value)}
          />
        </div>
      </div>
      <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
        <div className="self-stretch flex-1 flex flex-col items-start justify-end">
          <input
            className="[outline:none] font-body text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-secondary border-[1px] border-solid border-primary"
            placeholder="Tor Proxy Port"
            type="text"
            value={textInput6Value}
            onChange={(event) => setTextInput6Value(event.target.value)}
          />
        </div>
      </div>
      <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
        <div className="self-stretch flex-1 flex flex-col items-start justify-end">
          <input
            className="[outline:none] font-body text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-secondary border-[1px] border-solid border-primary"
            placeholder="State entity endpoint"
            type="text"
            value={textInput7Value}
            onChange={(event) => setTextInput7Value(event.target.value)}
          />
        </div>
      </div>
      <div className="self-stretch h-[31px] flex flex-col items-start justify-start">
        <div className="self-stretch flex-1 flex flex-col items-start justify-end">
          <input
            className="[outline:none] font-body text-3xs bg-white self-stretch flex-1 rounded-md flex flex-row items-center justify-center pt-[5px] px-2.5 pb-2.5 text-secondary border-[1px] border-solid border-primary"
            placeholder="Swap conductor endpoint"
            type="text"
            value={textInput8Value}
            onChange={(event) => setTextInput8Value(event.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default ConnectivitySettingsForm;
