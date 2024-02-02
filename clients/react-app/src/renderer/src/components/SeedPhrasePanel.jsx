const SeedPhrasePanel = ({ mnemonic }) => {
  return (
    <div className="self-stretch flex-1 rounded-sm bg-white shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] overflow-hidden flex flex-row items-center justify-center p-2.5 text-left text-blue font-body-small">
      <div className="relative">{mnemonic}</div>
    </div>
  );
};

export default SeedPhrasePanel;
