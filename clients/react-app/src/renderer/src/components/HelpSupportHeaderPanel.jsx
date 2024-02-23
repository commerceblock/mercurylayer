import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const HelpSupportHeaderPanel = () => {
  const navigate = useNavigate()

  const onFrameContainer1Click = useCallback(() => {
    navigate('/mainpage')
  }, [navigate])

  return (
    <div className="self-stretch flex-1 shadow-[0px_1px_2px_rgba(0,_0,_0,_0.25)] flex flex-col items-start justify-start text-left text-5xl text-black font-body-small">
      <div className="self-stretch flex-1 rounded-t-sm rounded-b-none bg-white flex flex-row items-center justify-between p-2.5">
        <div className="flex flex-row items-center justify-start gap-[6px]">
          <img className="w-4 relative h-4" alt="" src="/vector.svg" />
          <div className="relative">{`Help & Support`}</div>
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
      <div className="self-stretch flex-1 rounded-t-none rounded-b-sm bg-white flex flex-row items-center justify-start py-[19px] px-[18px] gap-[22px] text-3xs text-mediumslateblue-100">
        <div
          className="cursor-pointer hover:underline relative text-[inherit]"
          href="https://github.com/commerceblock/mercurylayer/tree/dev/docs"
          target="_blank"
        >
          DOCS
        </div>
        <div className="cursor-pointer hover:underline relative text-[inherit]">SOCIAL</div>
        <div className="cursor-pointer hover:underline relative text-[inherit]">REPORT BUGS</div>
      </div>
    </div>
  )
}

export default HelpSupportHeaderPanel
