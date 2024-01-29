import { useState } from 'react';

const MainInfoPanel = () => {
  const [activeTab, setActiveTab] = useState('Statecoins');

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="self-stretch flex-1 rounded-sm bg-white shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] overflow-hidden flex flex-col items-center justify-start p-2.5 text-center text-base text-primary font-body-small">
      <div className="self-stretch flex flex-row items-start justify-center gap-[10px]">
        <div
          className={`flex-1 relative bg-white box-border h-12 overflow-hidden border-b-[2px] border-solid cursor-pointer ${activeTab === 'Statecoins' ? 'border-primary' : 'border-tertiary'
            }`}
          onClick={() => handleTabClick('Statecoins')}
        >
          <div className={`absolute w-full top-[calc(50%_-_12px)] left-[0px] tracking-[-0.02em] leading-[22px] font-semibold inline-block text-primary`}>
            Statecoins
          </div>
        </div>
        <div
          className={`flex-1 relative bg-white box-border h-12 overflow-hidden border-b-[2px] border-solid cursor-pointer ${activeTab === 'Activity Log' ? 'border-primary' : 'border-tertiary'
            }`}
          onClick={() => handleTabClick('Activity Log')}
        >
          <div className={`absolute w-full top-[calc(50%_-_12px)] left-[0px] tracking-[-0.02em] leading-[22px] font-semibold inline-block text-primary`}>
            Activity Log
          </div>
        </div>
      </div>

      <div className="tab-content mt-4">
        {activeTab === 'Statecoins' && (
          <div>
            <h2>Statecoins</h2>
            <p>Demo text showing Statecoins part.</p>
          </div>
        )}

        {activeTab === 'Activity Log' && (
          <div>
            <h2>Activity Log</h2>
            <p>Demo text containing activity logs.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainInfoPanel;
