import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { Provider } from 'react-redux'
import store from './store'
import { BrowserRouter } from 'react-router-dom'
import "./global.css";

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}><BrowserRouter><App /></BrowserRouter></Provider>
)