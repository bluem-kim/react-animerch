import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { TGAlertProvider } from './components/TGAlert.jsx'
import { initTheme } from './utils/theme'
// Initialize theme before render to avoid FOUC
initTheme();

// Diagnostics: confirm styling stack in console
console.log('Tailwind v4 + TailGrids enabled');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <TGAlertProvider>
        <App />
      </TGAlertProvider>
    </BrowserRouter>
  </StrictMode>,
)
