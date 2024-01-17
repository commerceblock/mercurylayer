import { useMemo } from "react";

const HelpSupportHeaderContainer = ({
  topContainerHelpSupportWidth,
  topContainerHelpSupportPosition,
  topContainerHelpSupportTop,
  topContainerHelpSupportRight,
  topContainerHelpSupportLeft,
  topContainerHelpSupportHeight,
  topContainerTitleHeight,
  topContainerTitlePadding,
  topContainerTitleFlex,
  topContainerTitleHeight1,
  topContainerTitleFlex1,
  onSeed8ContainerClick,
}) => {
  const topContainerHelpSupportStyle = useMemo(() => {
    return {
      width: topContainerHelpSupportWidth,
      position: topContainerHelpSupportPosition,
      top: topContainerHelpSupportTop,
      right: topContainerHelpSupportRight,
      left: topContainerHelpSupportLeft,
      height: topContainerHelpSupportHeight,
    };
  }, [
    topContainerHelpSupportWidth,
    topContainerHelpSupportPosition,
    topContainerHelpSupportTop,
    topContainerHelpSupportRight,
    topContainerHelpSupportLeft,
    topContainerHelpSupportHeight,
  ]);

  const topContainerTitleStyle = useMemo(() => {
    return {
      height: topContainerTitleHeight,
      padding: topContainerTitlePadding,
      flex: topContainerTitleFlex,
    };
  }, [
    topContainerTitleHeight,
    topContainerTitlePadding,
    topContainerTitleFlex,
  ]);

  const topContainerTitle1Style = useMemo(() => {
    return {
      height: topContainerTitleHeight1,
      flex: topContainerTitleFlex1,
    };
  }, [topContainerTitleHeight1, topContainerTitleFlex1]);

  return (
    <div
      className="shadow-[0px_1px_2px_rgba(0,_0,_0,_0.25)] w-[380px] flex flex-col items-start justify-start text-left text-3xl text-black font-body"
      style={topContainerHelpSupportStyle}
    >
      <div
        className="self-stretch rounded-t-sm rounded-b-none bg-white h-[41px] flex flex-row items-center justify-between py-0 px-2.5 box-border"
        style={topContainerTitleStyle}
      >
        <div className="flex flex-row items-center justify-start gap-[6px]">
          <img className="relative w-4 h-4" alt="" src="/vector.svg" />
          <div className="relative">{`Help & Support`}</div>
        </div>
        <div className="flex flex-row items-center justify-start text-center text-xs text-gray-500">
          <div
            className="rounded-3xs box-border w-[55px] h-7 flex flex-row items-center justify-center p-2.5 cursor-pointer border-[1px] border-solid border-silver-100"
            onClick={onSeed8ContainerClick}
          >
            <div className="flex-1 relative">BACK</div>
          </div>
        </div>
      </div>
      <div
        className="self-stretch rounded-t-none rounded-b-sm bg-white h-[41px] flex flex-row items-center justify-start py-[19px] px-[18px] box-border gap-[22px] text-5xs text-mediumslateblue-100"
        style={topContainerTitle1Style}
      >
        <div className="relative">DOCS</div>
        <div className="relative">SOCIAL</div>
        <div className="relative">REPORT BUGS</div>
      </div>
    </div>
  );
};

export default HelpSupportHeaderContainer;
