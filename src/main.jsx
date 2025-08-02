import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import LegacyApp from './LegacyApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LegacyApp />
  </StrictMode>,
)
