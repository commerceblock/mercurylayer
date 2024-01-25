"use strict";
import React from "react";

const DisplaySeed = ({ mnemonic }) => {
    // Check if mnemonic is a string before splitting
    if (typeof mnemonic !== 'string') {
        // Handle the case where mnemonic is not a string (you might want to log an error or handle it in some way)
        return null; // or return an error message or a default UI
    }

    let words = mnemonic.split(" ");

    const inputs = words.map((item, index) => (
        <input
            className="opacity-100 relative rounded-[18px] p-[8px] w-[100px] border-[1px] border-[solid] border-[var(--button-border)] m-[8px]"
            key={index}
            type="text"
            placeholder={index + 1 + ". " + item}
            disabled
        />
    ));

    return (
        <div className="w-4/5 flex flex-wrap justify-center items-center mx-[auto] my-[0]">
            <form data-cy="seed-phrase">{inputs}</form>
        </div>
    );
};

export default DisplaySeed;
