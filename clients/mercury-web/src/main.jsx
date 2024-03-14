import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import store from "./store";
import "./index.css";

// Open a database connection
const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open("wallets", 1);

    request.onerror = (event) => {
      reject("Database error: " + event.target.errorCode);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore("wallets", { keyPath: "wallet_name" });
      db.createObjectStore("backup_txs", { keyPath: "statechain_id" });
    };
  });
};

openDatabase().then((db) => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <Provider store={store}>
        <HashRouter>
          <App db={db} />
        </HashRouter>
      </Provider>
    </React.StrictMode>
  );
});
