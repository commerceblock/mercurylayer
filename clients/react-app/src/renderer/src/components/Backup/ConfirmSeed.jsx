"use strict";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    setError,
} from "../../features/WalletDataSlice";

const TESTING_MODE = require("../../settings.json").testing_mode;

const ConfirmSeed = (props) => {
    const dispatch = useDispatch();
    const wizardState = useSelector((state) => state.wizard);

    const generateUniqueSeedArr = () => {
        var arr = [];
        while (arr.length < 3) {
            var r = Math.floor(Math.random() * 11);
            if (arr.indexOf(r) === -1) arr.push(r);
        }
        return arr;
    };

    const [rands] = useState(() =>
        !TESTING_MODE ? generateUniqueSeedArr() : []
    );

    let words = wizardState.mnemonic.split(" ");

    const [missingwords, setMissingWords] = useState(() =>
        rands.map((rand) => ({ pos: rand, word: "" }))
    );

    const inputMissingWord = (event) => {
        let map = missingwords.map((item) => {
            if (item.pos === parseInt(event.target.id)) {
                item.word = event.target.value;
            }
            return item;
        });
        setMissingWords(map);
    };

    const handleKeyDown = (e) => {
        let ASCIIchar = e.key.charCodeAt(0);

        if (
            (ASCIIchar < 97 || ASCIIchar > 122) &&
            ASCIIchar !== 66 &&
            ASCIIchar !== 84
        ) {
            e.preventDefault();
        }
    };

    // Display other words and create input boxes
    let words_without_missing = words.map((item, index) =>
        rands.includes(index) ? "" : item
    );

    const inputs = words_without_missing.map((item, index) => (
        <input
            key={index}
            id={index}
            type="text"
            placeholder={index + 1 + ". " + item}
            value={
                item === ""
                    ? missingwords.find((item) => {
                        if (item.pos === index) {
                            return item;
                        }
                        return null;
                    }).word
                    : ""
            }
            disabled={item === "" ? "" : "disabled"}
            onKeyDown={handleKeyDown}
            onChange={inputMissingWord}
        />
    ));

    // Confirm words are correct
    const onConfirmClick = async (event) => {
        // Verify mnemonic confirmation
        for (let i = 0; i < missingwords.length; i++) {
            if (missingwords[i].word !== words[missingwords[i].pos]) {
                event.preventDefault();
                dispatch(setError({ msg: "Seed confirmation failed." }));
                return;
            }
        }
    };

    return (
        <div className="wizard-form-confirm wizard-form inputs">
            <form data-cy="confirm-seed">{inputs}</form>
        </div>
    );
};

export default ConfirmSeed;