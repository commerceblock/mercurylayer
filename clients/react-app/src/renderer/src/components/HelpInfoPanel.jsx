import React, { useState } from 'react'

const HelpInfoPanel = () => {
  const [activeTab, setActiveTab] = useState('ABOUT') // Statecoins or Activity Log
  const handleTabClick = (tab) => {
    setActiveTab(tab)
  }

  return (
    <div className="self-stretch flex-1 rounded-sm bg-white shadow-[0px_2px_2px_rgba(0,_0,_0,_0.25)] overflow-hidden flex flex-col items-center justify-start p-2.5 gap-[10px] text-center text-base text-primary font-body-small">
      <div className="self-stretch flex flex-row items-start justify-center gap-[10px]">
        <div
          className={`flex-1 relative bg-white box-border h-12 overflow-hidden border-b-[2px] border-solid cursor-pointer ${
            activeTab === 'ABOUT' ? 'border-primary' : 'border-tertiary'
          }`}
          onClick={() => handleTabClick('ABOUT')}
        >
          <div
            className={`absolute w-full top-[calc(50%_-_12px)] left-[0px] tracking-[-0.02em] leading-[22px] font-semibold inline-block text-primary`}
          >
            ABOUT
          </div>
        </div>
        <div
          className={`flex-1 relative bg-white box-border h-12 overflow-hidden border-b-[2px] border-solid cursor-pointer ${
            activeTab === 'PRIVACY POLICY' ? 'border-primary' : 'border-tertiary'
          }`}
          onClick={() => handleTabClick('PRIVACY POLICY')}
        >
          <div
            className={`absolute w-full top-[calc(50%_-_12px)] left-[0px] tracking-[-0.02em] leading-[22px] font-semibold inline-block text-primary`}
          >
            PRIVACY POLICY
          </div>
        </div>
        <div
          className={`flex-1 relative bg-white box-border h-12 overflow-hidden border-b-[2px] border-solid cursor-pointer ${
            activeTab === 'TERMS OF USE' ? 'border-primary' : 'border-tertiary'
          }`}
          onClick={() => handleTabClick('TERMS OF USE')}
        >
          <div
            className={`absolute w-full top-[calc(50%_-_12px)] left-[0px] tracking-[-0.02em] leading-[22px] font-semibold inline-block text-primary`}
          >
            TERMS OF USE
          </div>
        </div>
      </div>

      <div className="self-stretch  gap-[10px]">
        {activeTab === 'ABOUT' && (
          <div>
            <h3 className="text-2xl font-semibold text-primary">Version 0.1</h3>
            <p>
              Mercury is an implementation of a layer-2 statechain protocol that enables off-chain
              transfer and settlement of Bitcoin outputs that remain under the full custody of the
              owner at all times, while benefitting from instant and negligible cost transactions.
              The ability to perform this transfer without requiring the confirmation (mining) of
              on-chain transactions has advantages in a variety of different applications. The
              Mercury Wallet operates with the Mercury protocol to enable users to keep secure
              custody of their Bitcoin while benefitting from fast, secure and private off-chain
              transactions. The essential function of the Mercury system is that it enables
              ownership (and control) of a Bitcoin output (a statecoin) to be transferred between
              two parties (who don't need to trust each other) via the Mercury server without an
              on-chain transaction. The Mercury server only needs to be trusted to operate the
              protocol (and crucially not store any information about previous key shares) and then
              the transfer of ownership is completely secure, even if the Mercury server was to
              later get compromised or hacked. At any time the server can prove that they have the
              key share for the current owner (and only to the current owner). A statecoin owner
              also possesses a proof that their ownership is unique via a statechain - immutable and
              unique sequences of verifiable ownership transfer. The current owner signs a
              statechain transaction with an owner key to transfer ownership to a new owner (i.e. a
              new owner key). This means that any theft of a coin can be independently and
              conclusively proven.
            </p>
            <p>
              A central feature of the Mercury wallet is the ability to perform atomic swaps of
              equal value statecoins in blinded groups facilitated by a so-called 'conductor' that
              cannot learn who swapped coins with who. This protocol employs a blind signature
              scheme to prevent any party from being able to reconstruct the coin history, providing
              Mercury users with a very powerful privacy tool. Due to the design of the Mercury
              protocol, all of these swaps occur off-chain, meaning they can happen very quickly and
              for zero additional transaction fees, leading to much bigger anonymity sets than is
              possible with a single on-chain coinjoin.
            </p>
          </div>
        )}
        {activeTab === 'PRIVACY POLICY' && (
          <div>
            <p>
              {' '}
              Mercury Wallet has developed this Privacy Statement to explain how it collects,
              stores, uses and protects personally identifiable information when users visit its
              website and use its services. This Privacy Statement does not apply to third-party
              websites or services which Mercury Wallet does not own or control including websites
              or services with advertisements or URL links hosted on the Mercury Wallet sites.
              Please contact the Mercury Wallet team (main@mercurywallet.com) if you have any
              questions about its privacy practices that are not addressed in this Privacy
              Statement. Please note: Layer Two Limited provides written user support only. Mercury
              does not offer phone support and will never call, e-mail or get in touch in any form
              with users to offer any wallet recovery services. Users are advised to be safe and
              guard their wallet information and funds. If you see any signs of abuse in this
              regard, please contact our Legal Team (main@mercurywallet.com)
            </p>
          </div>
        )}
        {activeTab === 'TERMS OF USE' && (
          <div>
            <h3 className="text-2xl font-semibold text-primary">Terms of Use</h3>
            <p>
              Users of Mercury Wallet should carefully read the terms of use detailed below. By
              clicking ‘Agree’ or by accessing or downloading our services a User agrees to be bound
              by these Terms of Use. These Terms of User are not assignable by the user to anyone
              else.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default HelpInfoPanel
