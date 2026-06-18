import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { installDevMock } from './lib/devMock'

// No-op inside Electron (real bridge present); provides sample data when the
// renderer is opened standalone in a browser for design/preview.
installDevMock()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
